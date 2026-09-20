import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../db/pool.js';
import { SESSION_TTL_MS, SESSION_COOKIE, publicAccount } from './service.js';
import { decryptSecret, encryptSecret, hashRecoveryCode, verifyTotp, createEnrollmentSecret, createRecoveryCodes } from './mfa.js';

type StaffRow = Record<string, unknown> & { password_salt: Buffer; password_hash: Buffer; account_id: string; id: string; mfa_secret_ciphertext?: Buffer; mfa_secret_iv?: Buffer; mfa_secret_auth_tag?: Buffer; mfa_key_version?: number; last_totp_counter?: number | null };
type PasswordHash = { salt: Buffer; hash: Buffer };
const normalize = (v: unknown) => String(v || '').trim().toLowerCase();
const validPassword = (v: unknown): v is string => typeof v === 'string' && v.length >= 14 && v.length <= 128;
const validUsername = (v: unknown): v is string => typeof v === 'string' && normalize(v).length > 0 && normalize(v).length <= 320;
const hashPassword = async (password: string, salt = crypto.randomBytes(16)): Promise<PasswordHash> => new Promise((resolve, reject) =>
  crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, hash) => e ? reject(e) : resolve({ salt, hash: Buffer.from(hash) })));
const generic = { success: false, error: 'invalid_credentials', message: 'Invalid credentials' };
async function recordFailure(pool: ReturnType<typeof getPool> | PoolClient, accountId: string, action: string): Promise<void> {
  const updated = await pool.query(`UPDATE staff_credentials SET failed_attempts=failed_attempts+1, locked_until=CASE WHEN failed_attempts+1 >= 5 THEN now()+interval '15 minutes' ELSE locked_until END, updated_at=now() WHERE account_id=$1 RETURNING failed_attempts`, [accountId]);
  await pool.query('INSERT INTO security_events(action,target_account_id) VALUES($1,$2)', [action, accountId]);
  if (Number(updated.rows[0]?.failed_attempts) >= 5) await pool.query('INSERT INTO security_events(action,target_account_id) VALUES($1,$2)', ['staff_lockout', accountId]);
}

async function signInInner(username: unknown, password: unknown, mfaCode: unknown, now: number, pool: ReturnType<typeof getPool> | PoolClient) {
  const key = normalize(typeof username === 'string' ? username.slice(0, 320) : '');
  let result;
  // Production transactions lock the parent account before its credentials.
  // DB-free injected executors retain the compact legacy fixture query.
  if ('release' in (pool as object)) {
    const identity = await pool.query('SELECT c.account_id FROM staff_credentials c WHERE c.username_normalized=$1', [key]);
    const accountId = identity.rows[0]?.account_id;
    if (accountId) await pool.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE', [accountId]);
    result = accountId ? await pool.query('SELECT c.*, a.* FROM staff_credentials c JOIN accounts a ON a.id=c.account_id WHERE c.account_id=$1 FOR UPDATE', [accountId]) : { rows: [] };
  } else result = await pool.query('SELECT c.*, a.* FROM staff_credentials c JOIN accounts a ON a.id=c.account_id WHERE c.username_normalized=$1 FOR UPDATE OF c', [key]);
  const row = result.rows[0] as StaffRow | undefined;
  const allowedRoles = ['coordinator', 'doctor', 'clinical_lead', 'hospital_admin', 'scheduler', 'supervisor', 'blood_approver'];
  if (!row || typeof password !== 'string' || !validPassword(password)) { await hashPassword(typeof password === 'string' ? password.slice(0, 128) : 'invalid-password'); return null; }
  if (!allowedRoles.includes(row.role as string)) { await hashPassword(password.slice(0, 128)); return null; }
  if (row.disabled_at || row.status !== 'active' || (row.locked_until && new Date(String(row.locked_until)).getTime() > now)) { await hashPassword(password); return null; }
  const candidate = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, row.password_salt, 64, { N: 16384, r: 8, p: 1 }, (e, h) => e ? reject(e) : resolve(h)));
  if (!crypto.timingSafeEqual(candidate, row.password_hash)) {
    await recordFailure(pool, row.account_id, 'staff_password_failure');
    return null;
  }
  if (!row.mfa_secret_ciphertext || !row.mfa_secret_iv || !row.mfa_secret_auth_tag || row.mfa_key_version !== 1) {
    await recordFailure(pool, row.account_id, 'staff_mfa_failure'); return null;
  }
  let secret: string;
  try { secret = decryptSecret(row.mfa_secret_ciphertext, row.mfa_secret_iv, row.mfa_secret_auth_tag); } catch { await pool.query('INSERT INTO security_events(action,target_account_id) VALUES($1,$2)', ['staff_mfa_unavailable', row.account_id]); return null; }
  const counter = verifyTotp(secret, mfaCode, now);
  let mfaOk = counter !== null && (row.last_totp_counter === null || row.last_totp_counter === undefined || counter > Number(row.last_totp_counter));
  if (mfaOk) {
    const updated = await pool.query('UPDATE staff_credentials SET last_totp_counter=$1,updated_at=now() WHERE account_id=$2 AND (last_totp_counter IS NULL OR last_totp_counter < $1) RETURNING account_id', [counter, row.account_id]);
    mfaOk = Boolean(updated.rowCount);
  }
  let usedRecovery = false;
  if (!mfaOk && typeof mfaCode === 'string') {
    const used = await pool.query('UPDATE staff_recovery_codes SET used_at=now() WHERE account_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING id', [row.account_id, hashRecoveryCode(mfaCode)]);
    mfaOk = Boolean(used.rowCount); usedRecovery = mfaOk;
  }
  if (!mfaOk) {
    await recordFailure(pool, row.account_id, 'staff_mfa_failure'); return null;
  }
  await pool.query('UPDATE staff_credentials SET failed_attempts=0, locked_until=NULL, updated_at=now() WHERE account_id=$1', [row.account_id]);
  await pool.query('INSERT INTO security_events(action,target_account_id) VALUES($1,$2)', ['staff_mfa_success', row.account_id]);
  if (usedRecovery) await pool.query('INSERT INTO security_events(action,target_account_id) VALUES($1,$2)', ['staff_recovery_used', row.account_id]);
  const token = crypto.randomBytes(32).toString('base64url');
  const session = await pool.query('INSERT INTO sessions(account_id,token_hash,expires_at) VALUES($1,digest($2,\'sha256\'),now()+$3::interval) RETURNING id', [row.account_id, token, `${SESSION_TTL_MS} milliseconds`]);
  return { token, sessionId: session.rows[0].id, account: publicAccount(row) };
}

/** Sign-in is serialized with credential administration on the credential row. */
async function signIn(username: unknown, password: unknown, mfaCode?: unknown, now = Date.now(), pool: ReturnType<typeof getPool> | PoolClient = getPool()) {
  const connect = (pool as { connect?: () => Promise<PoolClient> }).connect;
  if (!connect) return signInInner(username, password, mfaCode, now, pool);
  const client = await connect.call(pool);
  try { await client.query('BEGIN'); const result = await signInInner(username, password, mfaCode, now, client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

async function provisionMfa(accountId: string, username: string, password: string, executor: PoolClient | ReturnType<typeof getPool> = getPool(), suppliedSecret?: string) {
  if (!validUsername(username)) throw new Error('Username must be 1-320 characters');
  if (!validPassword(password)) throw new Error('Password must be 14-128 characters');
  const target = (await executor.query('SELECT id,role,status,hospital_id,service_scope FROM accounts WHERE id=$1 FOR UPDATE', [accountId])).rows[0] as { id: string; role: string; status: string; hospital_id: string | null; service_scope: string[] } | undefined;
  const allowed = ['coordinator', 'doctor', 'clinical_lead', 'hospital_admin', 'scheduler', 'supervisor', 'blood_approver'];
  if (!target || target.status !== 'active' || target.role === 'citizen' || !allowed.includes(target.role) || !target.hospital_id || !Array.isArray(target.service_scope) || target.service_scope.length === 0 || target.service_scope.some((s) => !['blood', 'kidney'].includes(s))) throw new Error('Invalid staff account assignment');
  const secret = suppliedSecret || createEnrollmentSecret();
  if (!/^[A-Z2-7]{16,64}$/.test(secret)) throw new Error('Invalid TOTP seed');
  const encrypted = encryptSecret(secret); const codes = createRecoveryCodes();
  const h = await hashPassword(password);
  await executor.query('INSERT INTO staff_credentials(account_id,username,username_normalized,password_salt,password_hash,mfa_secret_ciphertext,mfa_secret_iv,mfa_secret_auth_tag,mfa_key_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [accountId, username, normalize(username), h.salt, h.hash, encrypted.ciphertext, encrypted.iv, encrypted.authTag, encrypted.keyVersion]);
  for (const code of codes) await executor.query('INSERT INTO staff_recovery_codes(account_id,code_hash) VALUES($1,$2)', [accountId, hashRecoveryCode(code)]);
  return { enrollmentUri: `otpauth://totp/eBuhay:${encodeURIComponent(username)}?secret=${secret}&issuer=eBuhay&algorithm=SHA1&digits=6&period=30`, recoveryCodes: codes };
}

async function revokeStaff(accountId: string, executor: PoolClient | ReturnType<typeof getPool> = getPool()) { await executor.query('UPDATE sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=$1 AND revoked_at IS NULL', [accountId]); }
export { normalize, validUsername, validPassword, hashPassword, signIn, provisionMfa, revokeStaff, generic, SESSION_COOKIE, SESSION_TTL_MS };
