import { closePool, getPool } from './db/pool.js';
import { isMainModule, loadRuntimeConfig, redactedErrorMessage, type RuntimeConfig } from './runtime/config.js';
import { withDeadline } from './runtime/shutdown.js';

export type AppointmentDelivery = (message: { eventType: string; idempotencyKey: string; payload: unknown }) => Promise<{ sent: true; providerResponseReference?: string } | { sent: false; errorCode: string }>;
export type WorkerOptions = { config: RuntimeConfig; check?: () => Promise<void>; process?: () => Promise<void>; close?: () => Promise<void>; intervalMs?: number; shutdownTimeoutMs?: number };

export const appointmentRetryDelayMs = (attempt: number) => Math.min(300_000, 1000 * 2 ** Math.min(Math.max(attempt - 1, 0), 9));

export async function runAppointmentOutboxBatch(options: { deliver?: AppointmentDelivery; workerId?: string; batchSize?: number; now?: () => Date } = {}) {
  const pool = getPool();
  const workerId = options.workerId ?? `appointments-${process.pid}`;
  const now = options.now?.() ?? new Date();
  const client = await pool.connect();
  let rows: Array<{ id: string; event_type: string; idempotency_key: string; payload: unknown; attempts: number }> = [];
  try {
    await client.query('BEGIN');
    const leased = await client.query(`UPDATE appointment_outbox SET status='sending',attempts=attempts+1,leased_at=$1,lease_owner=$2,updated_at=$1
      WHERE id IN (SELECT id FROM appointment_outbox WHERE ((status IN ('pending','failed') AND available_at <= $1) OR (status='sending' AND leased_at < $3)) ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT $4)
      RETURNING id,event_type,idempotency_key,payload,attempts`, [now, workerId, new Date(now.getTime() - 5 * 60_000), options.batchSize ?? 25]);
    rows = leased.rows;
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }

  let sent = 0;
  for (const row of rows) {
    let result: Awaited<ReturnType<AppointmentDelivery>>;
    try {
      result = await (options.deliver ?? (async () => ({ sent: false as const, errorCode: 'integration_disabled' })))({ eventType: row.event_type, idempotencyKey: row.idempotency_key, payload: row.payload });
    } catch {
      result = { sent: false, errorCode: 'delivery_failed' };
    }
    const completion = await pool.connect();
    try {
      await completion.query('BEGIN');
      const reference = result.sent && typeof result.providerResponseReference === 'string' ? result.providerResponseReference.slice(0, 320) : null;
      const errorCode = result.sent ? null : (/^[a-z0-9_:-]{1,80}$/.test(result.errorCode) ? result.errorCode : 'delivery_failed');
      await completion.query(`INSERT INTO appointment_delivery_attempts(outbox_id,attempt_number,status,provider_response_reference,error_code) VALUES($1,$2,$3,$4,$5) ON CONFLICT(outbox_id,attempt_number) DO NOTHING`, [row.id, row.attempts, result.sent ? 'sent' : 'failed', reference, errorCode]);
      if (result.sent) {
        const updated = await completion.query(`UPDATE appointment_outbox SET status='sent',provider_response_reference=$1,last_error_code=NULL,lease_owner=NULL,leased_at=NULL,updated_at=$2 WHERE id=$3 AND status='sending' AND lease_owner=$4 RETURNING id`, [reference, now, row.id, workerId]);
        sent += updated.rowCount ?? 0;
      } else {
        const terminal = row.attempts >= 8;
        const updated = await completion.query(`UPDATE appointment_outbox SET status=$1,last_error_code=$2,available_at=$3,lease_owner=NULL,leased_at=NULL,updated_at=$4 WHERE id=$5 AND status='sending' AND lease_owner=$6 RETURNING id`, [terminal ? 'dead_letter' : 'failed', errorCode, new Date(now.getTime() + appointmentRetryDelayMs(row.attempts)), now, row.id, workerId]);
        if (terminal && updated.rowCount) await completion.query(`INSERT INTO follow_up_tasks(episode_id,booking_id,assigned_team,cause,status,conflict_reference,outbox_id) SELECT NULLIF(payload->>'episodeId','')::uuid,NULLIF(payload->>'bookingId','')::uuid,'coordination','appointment_outbox_dead_letter','pending',$1,id FROM appointment_outbox WHERE id=$1 ON CONFLICT (outbox_id) WHERE outbox_id IS NOT NULL DO NOTHING`, [row.id]);
      }
      await completion.query('COMMIT');
    } catch (error) {
      await completion.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { completion.release(); }
  }
  return { leased: rows.length, sent, failed: rows.length - sent };
}

export async function startWorker(options: WorkerOptions) {
  const check = options.check ?? (async () => { await getPool().query('SELECT 1'); });
  await check();
  const processWork = options.process ?? (options.check ? check : () => runAppointmentOutboxBatch().then(() => undefined));
  let inFlight: Promise<void> | undefined;
  const runWork = () => { if (!inFlight) inFlight = processWork().catch(() => undefined).finally(() => { inFlight = undefined; }); };
  runWork();
  const timer = setInterval(runWork, options.intervalMs ?? 30000);
  const stop = async () => {
    clearInterval(timer);
    await withDeadline(async () => { await inFlight; await (options.close ?? closePool)(); }, options.shutdownTimeoutMs ?? options.config.shutdownTimeoutMs, () => undefined);
  };
  return { stop };
}

if (process.argv[1] && isMainModule(import.meta.url, process.argv[1])) {
  try {
    const config = loadRuntimeConfig();
    const worker = await startWorker({ config });
    process.once('SIGTERM', () => void worker.stop().finally(() => process.exit(0)));
    process.once('SIGINT', () => void worker.stop().finally(() => process.exit(0)));
  } catch (error) {
    console.error(redactedErrorMessage(error));
    process.exit(1);
  }
}
