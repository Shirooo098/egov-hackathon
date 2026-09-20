import { getPool } from '../db/pool.js';
import { createEnrollmentSecret, createRecoveryCodes, encryptSecret, hashRecoveryCode } from './mfa.js';
import { hashPassword, validPassword, revokeStaff } from './staff.js';

type Db = { query: (sql: string, params?: unknown[]) => Promise<any>; connect?: () => Promise<any> };
const roles = ['coordinator', 'doctor', 'clinical_lead', 'hospital_admin', 'scheduler', 'supervisor', 'blood_approver'];
const services = ['blood', 'kidney'];
const live = () => process.env.EBUHAY_MODE === 'controlled-live' || process.env.EBUHAY_MODE === 'production';
function sanitize(value: unknown): unknown { if (Array.isArray(value)) return value.map(sanitize); if (!value || typeof value !== 'object') return value; return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !/(password|secret|recovery|token|code)/i.test(key)).map(([key, item]) => [key, sanitize(item)])); }
async function tx<T>(db: Db, work: (c: Db) => Promise<T>): Promise<T> {
  if (!db.connect) return work(db); const c = await db.connect();
  try { await c.query('BEGIN'); const result = await work(c); await c.query('COMMIT'); return result; }
  catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
}
async function authorize(c: Db, actorId: string, targetId: string) {
  const actor = (await c.query('SELECT id,role,status,hospital_id,service_scope FROM accounts WHERE id=$1 FOR SHARE', [actorId])).rows[0];
  const targetAccount = (await c.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE', [targetId])).rows[0];
  const credential = (await c.query('SELECT * FROM staff_credentials WHERE account_id=$1 FOR UPDATE', [targetId])).rows[0];
  const target = targetAccount && credential ? { ...targetAccount, ...credential } : undefined;
  if (!actor || actor.role !== 'hospital_admin' || actor.status !== 'active' || !target || target.role === 'citizen' || actor.hospital_id !== target.hospital_id) throw new Error('Unauthorized staff administration');
  return { actor, target };
}
async function audit(c: Db, actor: string, action: string, target: string, details: Record<string, unknown> = {}) {
  await c.query('INSERT INTO security_events(actor_account_id,action,target_account_id,details) VALUES($1,$2,$3,$4)', [actor, action, target, JSON.stringify(details)]);
}
async function mutate(accountId: string, actorId: string, action: string, change: (c: Db, target: any) => Promise<Record<string, unknown> | void>, db: Db = getPool()) {
  return tx(db, async (c) => { const { target } = await authorize(c, actorId, accountId); const details = await change(c, target) || {}; await revokeStaff(accountId, c as any); const { enrollmentUri: _uri, recoveryCodes: _codes, ...safeDetails } = details as any; await audit(c, actorId, action, accountId, safeDetails); return details; });
}
export async function resetStaffPassword(accountId: string, actorId: string, password: string, db: Db = getPool()) {
  if (!validPassword(password)) throw new Error('Password must be 14-128 characters');
  return mutate(accountId, actorId, 'staff_password_reset', async (c) => { const h = await hashPassword(password); await c.query('UPDATE staff_credentials SET password_salt=$1,password_hash=$2,failed_attempts=0,locked_until=NULL,updated_at=now() WHERE account_id=$3', [h.salt, h.hash, accountId]); return {}; }, db);
}
export async function resetStaffMfa(accountId: string, actorId: string, db: Db = getPool()): Promise<{ enrollmentUri: string; recoveryCodes: string[] }> {
  return mutate(accountId, actorId, 'staff_mfa_reset', async (c, target) => { const secret = createEnrollmentSecret(); const encrypted = encryptSecret(secret); const codes = createRecoveryCodes(); await c.query('UPDATE staff_credentials SET mfa_secret_ciphertext=$1,mfa_secret_iv=$2,mfa_secret_auth_tag=$3,mfa_key_version=$4,last_totp_counter=NULL,updated_at=now() WHERE account_id=$5', [encrypted.ciphertext, encrypted.iv, encrypted.authTag, encrypted.keyVersion, accountId]); await c.query('DELETE FROM staff_recovery_codes WHERE account_id=$1', [accountId]); for (const code of codes) await c.query('INSERT INTO staff_recovery_codes(account_id,code_hash) VALUES($1,$2)', [accountId, hashRecoveryCode(code)]); return { enrollmentUri: `otpauth://totp/eBuhay:${encodeURIComponent(target.username)}?secret=${secret}&issuer=eBuhay`, recoveryCodes: codes }; }, db) as Promise<{ enrollmentUri: string; recoveryCodes: string[] }>;
}
export async function recoverStaffAccount(accountId: string, actorId: string, db: Db = getPool()) { return mutate(accountId, actorId, 'staff_account_recovered', async (c) => { await c.query("UPDATE accounts SET status='active',updated_at=now() WHERE id=$1", [accountId]); await c.query('UPDATE staff_credentials SET disabled_at=NULL,failed_attempts=0,locked_until=NULL,updated_at=now() WHERE account_id=$1', [accountId]); return {}; }, db); }
export async function disableStaffAccount(accountId: string, actorId: string, db: Db = getPool()) { return mutate(accountId, actorId, 'staff_account_disabled', async (c) => { await c.query("UPDATE accounts SET status='disabled',updated_at=now() WHERE id=$1", [accountId]); await c.query('UPDATE staff_credentials SET disabled_at=now(),updated_at=now() WHERE account_id=$1', [accountId]); return {}; }, db); }
export async function changeStaffAccess(accountId: string, actorId: string, role: string, hospitalId: string, serviceScope: string[], db: Db = getPool()) {
  if (!roles.includes(role) || !hospitalId || !serviceScope.length || serviceScope.some((s) => !services.includes(s)) || (live() && serviceScope.some((s) => s !== 'blood'))) throw new Error('Invalid staff access');
  return mutate(accountId, actorId, 'staff_access_changed', async (c, target) => { if (target.hospital_id !== hospitalId) throw new Error('Hospital scope mismatch'); await c.query('UPDATE accounts SET role=$1,hospital_id=$2,service_scope=$3,status=\'active\',updated_at=now() WHERE id=$4', [role, hospitalId, serviceScope, accountId]); return { role, hospitalId, serviceScope }; }, db);
}
export async function reassignStaffWork(fromStaffId: string, replacementStaffId: string, actorId: string, db: Db = getPool()) {
  return tx(db, async (c) => {
    const { actor } = await authorize(c, actorId, fromStaffId);
    const replacementAccount = (await c.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE', [replacementStaffId])).rows[0];
    const replacementCredential = (await c.query('SELECT * FROM staff_credentials WHERE account_id=$1 FOR UPDATE', [replacementStaffId])).rows[0];
    const replacement = replacementAccount && replacementCredential ? { ...replacementAccount, ...replacementCredential } : undefined;
    if (!replacement || replacement.status !== 'active' || replacement.hospital_id !== actor.hospital_id || !roles.includes(replacement.role) || !replacement.mfa_secret_ciphertext || !replacement.mfa_secret_iv || !replacement.mfa_secret_auth_tag || replacement.mfa_key_version !== 1) {
      throw new Error('Invalid replacement staff; cross-hospital transfer requires external authorization');
    }
    const assignments = (await c.query(`SELECT sa.id,sa.episode_id,sa.review_id,sa.primary_staff_id,sa.coverage_staff_id,svc.hospital_id,svc.code
      FROM staff_assignments sa JOIN services svc ON svc.id=sa.service_id
      WHERE sa.primary_staff_id=$1 OR sa.coverage_staff_id=$1 FOR UPDATE`, [fromStaffId])).rows;
    for (const assignment of assignments) {
      const expectedRole = assignment.episode_id && !assignment.review_id
        ? 'coordinator'
        : assignment.review_id && !assignment.episode_id ? 'doctor' : null;
      if (!expectedRole || assignment.hospital_id !== actor.hospital_id || replacement.role !== expectedRole || !replacement.service_scope?.includes(assignment.code)) {
        throw new Error('Replacement staff is not eligible for assignment service or duty');
      }
    }
    let count = 0;
    for (const assignment of assignments) {
      const result = await c.query(`UPDATE staff_assignments
        SET primary_staff_id=CASE WHEN primary_staff_id=$1 THEN $2 ELSE primary_staff_id END,
            coverage_staff_id=CASE WHEN coverage_staff_id=$1 THEN $2 ELSE coverage_staff_id END,
            version=version+1,updated_at=now()
        WHERE id=$3 AND (primary_staff_id=$1 OR coverage_staff_id=$1)`, [fromStaffId, replacementStaffId, assignment.id]);
      count += result.rowCount ?? 0;
    }
    await audit(c, actorId, 'staff_work_reassigned', fromStaffId, { replacementStaffId, count });
    return { count };
  });
}
export async function staffAuditHistory(accountId: string, actorId: string, db: Db = getPool()) { return tx(db, async (c) => { await authorize(c, actorId, accountId); const r = await c.query('SELECT action,target_account_id,created_at,details FROM security_events WHERE target_account_id=$1 ORDER BY created_at DESC', [accountId]); return r.rows.map((x: any) => ({ action: x.action, targetAccountId: x.target_account_id, createdAt: x.created_at, details: sanitize(x.details) })); }); }
