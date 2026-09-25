import crypto from 'node:crypto';
import { getPool } from '../db/pool.js';
import { SESSION_TTL_MS, currentSession } from './service.js';
import { cookieOptions, clearCookie } from './cookie.js';

export const PENDING_COOKIE = 'ebuhay_egov_pending';
const hash = (value: string) => crypto.createHash('sha256').update(value).digest();
const token = () => crypto.randomBytes(32).toString('base64url');
const validPendingId = (value: string | undefined) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
const pendingCookie = (value: string) => `${PENDING_COOKIE}=${value}; ${cookieOptions.replace(/Max-Age=\d+/, 'Max-Age=600')}`;
const clearPendingCookie = `${PENDING_COOKIE}=; ${clearCookie}`;

export function readCookie(raw: string | undefined, name: string): string | undefined {
  const part = (raw ?? '').split(';').find((entry) => entry.trim().startsWith(`${name}=`));
  if (!part) return undefined;
  try { return decodeURIComponent(part.trim().slice(name.length + 1)); } catch { return undefined; }
}

export async function createPending(identity: { uniqid: string; displayName: string; mobile?: string }, exchangeTransactionId: string) {
  const value = token();
  const result = await getPool().query(
    `INSERT INTO egov_sso_pending(cookie_hash,exchange_transaction_id,uniqid,display_name,mobile,provider,expires_at) VALUES($1,$2,$3,$4,$5,'egovph',now()+interval '10 minutes') RETURNING id`,
    [hash(value), exchangeTransactionId, identity.uniqid, identity.displayName, identity.mobile ?? null],
  );
  return { pendingId: String(result.rows[0].id), setCookie: pendingCookie(value) };
}

export async function pendingIdentity(cookie: string | undefined) {
  if (!cookie) return null;
  const result = await getPool().query(`SELECT id,display_name AS "displayName" FROM egov_sso_pending WHERE cookie_hash=$1 AND consumed_at IS NULL AND expires_at>now()`, [hash(cookie)]);
  return result.rowCount ? { pendingId: String(result.rows[0].id), displayName: String(result.rows[0].displayName) } : null;
}

export async function confirmPending(cookie: string | undefined, pendingId: string | undefined, activeSession: string | undefined) {
  if (!cookie) return { error: 'pending_missing' as const };
  if (!validPendingId(pendingId)) return { error: 'pending_missing' as const };
  if (activeSession && await currentSession(activeSession)) return { error: 'session_exists' as const };
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const pending = await client.query(`SELECT id,exchange_transaction_id,uniqid,display_name,mobile FROM egov_sso_pending WHERE cookie_hash=$1 AND id=$2 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`, [hash(cookie), pendingId]);
    if (!pending.rowCount) { await client.query('ROLLBACK'); return { error: 'pending_missing' as const }; }
    const row = pending.rows[0];
    const profile = JSON.stringify({ provider: 'egovph', displayName: row.display_name, ...(row.mobile ? { mobile: row.mobile } : {}) });
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`egovph:${row.uniqid}`]);
    const identity = await client.query(`SELECT a.id,a.role,a.status,a.display_name FROM egov_identities e JOIN accounts a ON a.id=e.account_id WHERE e.uniqid=$1 AND e.provider='egovph' FOR UPDATE`, [row.uniqid]);
    let account = identity.rows[0];
    if (account && (account.role !== 'citizen' || account.status !== 'active')) { await client.query('ROLLBACK'); return { error: 'invalid_identity' as const }; }
    if (!account) {
      const created = await client.query(`INSERT INTO accounts(login_identity,display_name,role) VALUES($1,$2,'citizen') RETURNING id,role,display_name`, [`egovph:${row.uniqid}`, row.display_name]);
      account = created.rows[0];
      await client.query(`INSERT INTO egov_identities(account_id,uniqid,provider,profile) VALUES($1,$2,'egovph',$3)`, [account.id, row.uniqid, profile]);
    } else {
      await client.query(`UPDATE egov_identities SET profile=$1,updated_at=now() WHERE account_id=$2 AND provider='egovph'`, [profile, account.id]);
      await client.query(`UPDATE accounts SET display_name=$1,updated_at=now() WHERE id=$2`, [row.display_name, account.id]);
      account.display_name = row.display_name;
    }
    await client.query(`UPDATE notification_preferences SET sms_consent=false,phone_number=NULL,updated_at=now() WHERE account_id=$1 AND phone_number IS DISTINCT FROM $2`, [account.id, row.mobile ?? null]);
    const session = token();
    await client.query(`INSERT INTO sessions(account_id,token_hash,expires_at) VALUES($1,digest($2,'sha256'),now()+$3::interval)`, [account.id, session, `${SESSION_TTL_MS} milliseconds`]);
    await client.query(`UPDATE egov_sso_pending SET consumed_at=now() WHERE id=$1`, [row.id]);
    await client.query(`UPDATE egov_exchange_transactions SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL`, [row.exchange_transaction_id]);
    await client.query(`INSERT INTO egov_verification_history(account_id,exchange_transaction_id,uniqid,profile,source) VALUES($1,$2,$3,$4,'egovph')`, [account.id, row.exchange_transaction_id, row.uniqid, JSON.stringify({ provider: 'egovph', displayName: row.display_name })]);
    await client.query('COMMIT');
    return { session, account: { id: String(account.id), role: 'citizen', displayName: String(account.display_name ?? '') } };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function cancelPending(cookie: string | undefined, pendingId: string | undefined) {
  if (!cookie || !validPendingId(pendingId)) return false;
  const result = await getPool().query(`UPDATE egov_sso_pending SET consumed_at=now() WHERE cookie_hash=$1 AND id=$2 AND consumed_at IS NULL RETURNING id`, [hash(cookie), pendingId]);
  return Boolean(result.rowCount);
}

export { clearPendingCookie };
