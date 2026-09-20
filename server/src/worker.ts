import { closePool, getPool } from "./db/pool.js";
import {
  isMainModule,
  loadRuntimeConfig,
  redactedErrorMessage,
  type RuntimeConfig,
} from "./runtime/config.js";
import { withDeadline } from "./runtime/shutdown.js";
import { broadcast, egovchainEnabled, verifyReceipt, rpc, signConsentTransaction, signerAddress } from "./services/EgovChainService.js";

export type AppointmentDelivery = (message: {
  eventType: string;
  idempotencyKey: string;
  payload: unknown;
}) => Promise<
  | { sent: true; providerResponseReference?: string }
  | { sent: false; errorCode: string }
>;
export type WorkerOptions = {
  config: RuntimeConfig;
  check?: () => Promise<void>;
  process?: () => Promise<void>;
  close?: () => Promise<void>;
  intervalMs?: number;
  shutdownTimeoutMs?: number;
};

export const appointmentRetryDelayMs = (attempt: number) =>
  Math.min(300_000, 1000 * 2 ** Math.min(Math.max(attempt - 1, 0), 9));

export async function runConsentAnchorBatch(options: { batchSize?: number; workerId?: string } = {}) {
  if (!egovchainEnabled()) return { leased: 0, verified: 0, failed: 0 };
  const pool = getPool();
  const owner = options.workerId ?? `consent-${process.pid}`;
  const now = new Date();
  const leased = await pool.query(`UPDATE consent_anchor_outbox SET status='sending',attempts=attempts+1,leased_at=$1,lease_owner=$2,updated_at=$1
    WHERE id IN (SELECT id FROM consent_anchor_outbox WHERE ((status IN ('pending','failed') AND available_at <= $1) OR (status='sending' AND leased_at < $3)) ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT $4)
    RETURNING id,episode_consent_id,pair_consent_id,commitment,attempts,nonce,raw_transaction,tx_hash`, [now, owner, new Date(now.getTime() - 5 * 60_000), options.batchSize ?? 25]);
  let verified = 0, failed = 0;
  for (const row of leased.rows) {
    try {
      let raw = row.raw_transaction as string | null, txHash = row.tx_hash as string | null;
      if (!raw || row.nonce === null) {
        const address = signerAddress();
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [address]);
          const nonceHex = await rpc('eth_getTransactionCount', [address, 'pending']) as string;
          const reserved = await client.query('SELECT COALESCE(max(nonce)+1,0)::bigint AS next FROM consent_anchor_outbox WHERE signer_address=$1', [address]);
          const nonce = Math.max(Number(BigInt(nonceHex)), Number(reserved.rows[0].next));
          const signed = await signConsentTransaction(row.commitment, nonce);
          raw = signed.raw; txHash = signed.txHash;
          const saved = await client.query(`UPDATE consent_anchor_outbox SET signer_address=$1,nonce=$2,raw_transaction=$3,tx_hash=$4,updated_at=now() WHERE id=$5 AND lease_owner=$6 AND status='sending'`, [address, nonce, raw, txHash, row.id, owner]);
          if (!saved.rowCount) throw new Error('anchor_lease_lost');
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
      }
      const current = await verifyReceipt(txHash!, row.commitment);
      if (!current) await broadcast(raw!);
      const proof = current ?? await verifyReceipt(txHash!, row.commitment);
      if (!proof) throw new Error('egovchain_receipt_pending');
      const status = proof.status === '0x1' ? 'verified' : 'failed';
      const table = row.episode_consent_id ? 'episode_consents' : 'pair_consents';
      const column = row.episode_consent_id ? 'episode_consent_id' : 'pair_consent_id';
      const completion = await pool.connect();
      try {
        await completion.query('BEGIN');
        const fenced = await completion.query(`UPDATE consent_anchor_outbox SET status=$1,lease_owner=NULL,leased_at=NULL,last_error_code=$2,updated_at=now() WHERE id=$3 AND lease_owner=$4 AND status='sending'`, [status, status === 'failed' ? 'reverted' : null, row.id, owner]);
        if (!fenced.rowCount) throw new Error('anchor_lease_lost');
        await completion.query(`UPDATE ${table} c SET anchor_status=$1,anchor_tx_hash=$2,anchor_block_hash=$3,anchor_block_number=$4,anchor_error_code=$5 FROM consent_anchor_outbox o WHERE o.${column}=$6 AND c.id=o.${column}`, [status, txHash, proof.blockHash ?? null, proof.blockNumber ? Number(BigInt(proof.blockNumber)) : null, status === 'failed' ? 'reverted' : null, row[column]]);
        if (row.pair_consent_id) {
          await completion.query(`UPDATE pair_proposals p
            SET anchor_status=CASE
              WHEN (SELECT count(*) FROM pair_consents pc WHERE pc.pair_id=p.id AND pc.action='grant') >= 4
               AND NOT EXISTS (SELECT 1 FROM pair_consents pc WHERE pc.pair_id=p.id AND pc.action='grant' AND pc.anchor_status <> 'verified')
              THEN 'verified'
              ELSE p.anchor_status
            END,
            updated_at=now()
            WHERE id=(SELECT pair_id FROM pair_consents WHERE id=$1)`, [row.pair_consent_id]);
        }
        await completion.query('COMMIT');
      } catch (error) { await completion.query('ROLLBACK').catch(() => {}); throw error; } finally { completion.release(); }
      if (status === 'verified') verified++; else failed++;
    } catch (error) {
      failed++;
      const code = error instanceof Error && /^egovchain_[a-z0-9_]+$/.test(error.message) ? error.message : 'anchor_failed';
      await pool.query(`UPDATE consent_anchor_outbox SET status=CASE WHEN attempts>=8 THEN 'dead_letter' ELSE 'failed' END,last_error_code=$1,available_at=now()+interval '30 seconds',lease_owner=NULL,leased_at=NULL,updated_at=now() WHERE id=$2 AND lease_owner=$3`, [code, row.id, owner]);
    }
  }
  let reorged = 0;
  const sweep = await pool.query(`SELECT id,episode_consent_id,pair_consent_id,commitment,tx_hash FROM consent_anchor_outbox WHERE status='verified' ORDER BY updated_at ASC LIMIT $1`, [options.batchSize ?? 25]);
  for (const row of sweep.rows) {
    if (await verifyReceipt(row.tx_hash, row.commitment)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE consent_anchor_outbox SET status='failed',last_error_code='receipt_reorged',available_at=now(),updated_at=now() WHERE id=$1 AND status='verified'`, [row.id]);
      const table = row.episode_consent_id ? 'episode_consents' : 'pair_consents';
      const column = row.episode_consent_id ? 'episode_consent_id' : 'pair_consent_id';
      await client.query(`UPDATE ${table} c SET anchor_status='failed',anchor_error_code='receipt_reorged' FROM consent_anchor_outbox o WHERE o.${column}=$1 AND c.id=o.${column}`, [row[column]]);
      if (row.pair_consent_id) {
        await client.query(`UPDATE pair_proposals SET anchor_status='pending', updated_at=now() WHERE id=(SELECT pair_id FROM pair_consents WHERE id=$1)`, [row.pair_consent_id]);
      }
      await client.query('COMMIT');
      reorged++;
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  }
  return { leased: leased.rowCount ?? 0, verified, failed: failed + reorged, reorged };
}

export async function runAppointmentOutboxBatch(
  options: {
    deliver?: AppointmentDelivery;
    workerId?: string;
    batchSize?: number;
    now?: () => Date;
  } = {},
) {
  const pool = getPool();
  const workerId = options.workerId ?? `appointments-${process.pid}`;
  const now = options.now?.() ?? new Date();
  const client = await pool.connect();
  let rows: Array<{
    id: string;
    event_type: string;
    idempotency_key: string;
    payload: unknown;
    attempts: number;
  }> = [];
  try {
    await client.query("BEGIN");
    const leased = await client.query(
      `UPDATE appointment_outbox SET status='sending',attempts=attempts+1,leased_at=$1,lease_owner=$2,updated_at=$1
      WHERE id IN (SELECT id FROM appointment_outbox WHERE ((status IN ('pending','failed') AND available_at <= $1) OR (status='sending' AND leased_at < $3)) ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT $4)
      RETURNING id,event_type,idempotency_key,payload,attempts`,
      [
        now,
        workerId,
        new Date(now.getTime() - 5 * 60_000),
        options.batchSize ?? 25,
      ],
    );
    rows = leased.rows;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  let sent = 0;
  for (const row of rows) {
    let result: Awaited<ReturnType<AppointmentDelivery>>;
    try {
      result = await (
        options.deliver ??
        (async () => ({
          sent: false as const,
          errorCode: "integration_disabled",
        }))
      )({
        eventType: row.event_type,
        idempotencyKey: row.idempotency_key,
        payload: row.payload,
      });
    } catch {
      result = { sent: false, errorCode: "delivery_failed" };
    }
    const completion = await pool.connect();
    try {
      await completion.query("BEGIN");
      const reference =
        result.sent && typeof result.providerResponseReference === "string"
          ? result.providerResponseReference.slice(0, 320)
          : null;
      const errorCode = result.sent
        ? null
        : /^[a-z0-9_:-]{1,80}$/.test(result.errorCode)
          ? result.errorCode
          : "delivery_failed";
      await completion.query(
        `INSERT INTO appointment_delivery_attempts(outbox_id,attempt_number,status,provider_response_reference,error_code) VALUES($1,$2,$3,$4,$5) ON CONFLICT(outbox_id,attempt_number) DO NOTHING`,
        [
          row.id,
          row.attempts,
          result.sent ? "sent" : "failed",
          reference,
          errorCode,
        ],
      );
      if (result.sent) {
        const updated = await completion.query(
          `UPDATE appointment_outbox SET status='sent',provider_response_reference=$1,last_error_code=NULL,lease_owner=NULL,leased_at=NULL,updated_at=$2 WHERE id=$3 AND status='sending' AND lease_owner=$4 RETURNING id`,
          [reference, now, row.id, workerId],
        );
        sent += updated.rowCount ?? 0;
      } else {
        const terminal = row.attempts >= 8;
        const updated = await completion.query(
          `UPDATE appointment_outbox SET status=$1,last_error_code=$2,available_at=$3,lease_owner=NULL,leased_at=NULL,updated_at=$4 WHERE id=$5 AND status='sending' AND lease_owner=$6 RETURNING id`,
          [
            terminal ? "dead_letter" : "failed",
            errorCode,
            new Date(now.getTime() + appointmentRetryDelayMs(row.attempts)),
            now,
            row.id,
            workerId,
          ],
        );
        if (terminal && updated.rowCount)
          await completion.query(
            `INSERT INTO follow_up_tasks(episode_id,booking_id,assigned_team,cause,status,conflict_reference,outbox_id) SELECT NULLIF(payload->>'episodeId','')::uuid,NULLIF(payload->>'bookingId','')::uuid,'coordination','appointment_outbox_dead_letter','pending',$1,id FROM appointment_outbox WHERE id=$1 ON CONFLICT (outbox_id) WHERE outbox_id IS NOT NULL DO NOTHING`,
            [row.id],
          );
      }
      await completion.query("COMMIT");
    } catch (error) {
      await completion.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      completion.release();
    }
  }
  return { leased: rows.length, sent, failed: rows.length - sent };
}

export async function startWorker(options: WorkerOptions) {
  const check =
    options.check ??
    (async () => {
      await getPool().query("SELECT 1");
    });
  await check();
  const processWork =
    options.process ??
    (options.check
      ? check
      : async () => { await runAppointmentOutboxBatch(); await runConsentAnchorBatch(); });
  let inFlight: Promise<void> | undefined;
  const runWork = () => {
    if (!inFlight)
      inFlight = processWork()
        .catch(() => undefined)
        .finally(() => {
          inFlight = undefined;
        });
  };
  runWork();
  const timer = setInterval(runWork, options.intervalMs ?? 30000);
  const stop = async () => {
    clearInterval(timer);
    await withDeadline(
      async () => {
        await inFlight;
        await (options.close ?? closePool)();
      },
      options.shutdownTimeoutMs ?? options.config.shutdownTimeoutMs,
      () => undefined,
    );
  };
  return { stop };
}

if (process.argv[1] && isMainModule(import.meta.url, process.argv[1])) {
  try {
    const config = loadRuntimeConfig();
    const worker = await startWorker({ config });
    process.once(
      "SIGTERM",
      () => void worker.stop().finally(() => process.exit(0)),
    );
    process.once(
      "SIGINT",
      () => void worker.stop().finally(() => process.exit(0)),
    );
  } catch (error) {
    console.error(redactedErrorMessage(error));
    process.exit(1);
  }
}
