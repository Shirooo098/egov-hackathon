import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { isLiveMode } from '../runtime/config.js';
import type { RuntimeMode } from '../runtime/config.js';

export interface BackupManifest {
  backupId: string;
  timestamp: string;
  environment: RuntimeMode;
  schemaVersion: string;
  tableCount: number;
  totalRecords: number;
  recordCounts: Record<string, number>;
  plainSha256: string;
  encryptionAlgorithm: 'aes-256-gcm';
}

export interface EncryptedBackupPackage {
  manifest: BackupManifest;
  encryption: {
    iv: string;
    authTag: string;
  };
  ciphertext: string;
}

export interface RestoreEvidence {
  id: string;
  backupId: string;
  rehearsalType: string;
  status: 'success' | 'failed' | 'safe_rollback';
  targetEnvironment: string;
  schemaVersion: string;
  tablesRestored: Record<string, number>;
  recordsRestored: number;
  durationMs: number;
  evidenceHash: string;
  safeFallbackActive: boolean;
  operatorAccountId?: string | null;
  errorDetails?: string | null;
  recordedAt: string;
}

export const DEPENDENCY_TABLE_ORDER = [
  'schema_migrations',
  'hospitals',
  'services',
  'accounts',
  'sessions',
  'staff_credentials',
  'staff_recovery_codes',
  'egov_identities',
  'egov_exchange_transactions',
  'egov_verification_history',
  'invitations',
  'admission_requests',
  'citizen_cases',
  'case_claims',
  'episodes',
  'recipient_intakes',
  'donor_intakes',
  'hospital_linkages',
  'hospital_slots',
  'hospital_linkage_history',
  'pair_proposals',
  'pair_responses',
  'pair_consents',
  'episode_consents',
  'staff_assignments',
  'clinical_reviews',
  'appointment_requests',
  'appointment_request_history',
  'bookings',
  'booking_changes',
  'blood_requests',
  'blood_donor_responses',
  'hospital_source_events',
  'appointment_outbox',
  'appointment_delivery_attempts',
  'deceased_offers',
  'coordination_updates',
  'conversations',
  'messages',
  'notifications',
  'notification_preferences',
  'notification_delivery_attempts',
  'citizen_profiles',
  'privacy_requests',
  'privacy_correction_history',
  'retention_policies',
  'legal_holds',
  'deletion_requests',
  'deletion_receipts',
  'workflow_kill_switches',
  'follow_up_tasks',
  'reconciliation_events',
  'audit_events',
  'security_events',
  'continuity_evidence'
];

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }
  if (Buffer.isBuffer(obj)) {
    return JSON.stringify(obj.toString('hex'));
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k]));
  return '{' + pairs.join(',') + '}';
}

export function computeBackupEvidenceHash(manifest: BackupManifest, ciphertext: string): string {
  return crypto
    .createHash('sha256')
    .update(canonicalize(manifest) + ':' + ciphertext)
    .digest('hex');
}

export function computeRestoreEvidenceHash(data: {
  backupId: string;
  status: string;
  schemaVersion: string;
  recordsRestored: number;
  tablesRestored: Record<string, number>;
  targetEnvironment: string;
}): string {
  return crypto.createHash('sha256').update(canonicalize(data)).digest('hex');
}

export async function createEncryptedBackup(options: {
  pool: Pool;
  encryptionKey: string;
  environment?: RuntimeMode;
  operatorAccountId?: string;
}): Promise<{ backupPackage: EncryptedBackupPackage; evidenceHash: string }> {
  const { pool, encryptionKey, operatorAccountId } = options;
  const envMode = options.environment || (process.env.EBUHAY_MODE as RuntimeMode) || 'synthetic';
  const backupId = crypto.randomUUID();

  // 1. Get latest schema migration version
  const schemaRes = await pool.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
  const schemaVersion = schemaRes.rows[0]?.version || '000_none';

  // 2. Discover tables that actually exist in the database
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const existingTables = new Set(tablesRes.rows.map((r: { table_name: string }) => r.table_name));

  // 3. Export table rows in dependency order
  const tablesToExport = DEPENDENCY_TABLE_ORDER.filter(t => existingTables.has(t));
  for (const t of existingTables) {
    if (!tablesToExport.includes(t)) {
      tablesToExport.push(t);
    }
  }

  const exportData: Record<string, any[]> = {};
  const recordCounts: Record<string, number> = {};
  let totalRecords = 0;

  for (const table of tablesToExport) {
    // Avoid backing up past backup rehearsal evidence to prevent unbounded growth, or include it
    const rowsRes = await pool.query(`SELECT * FROM "${table}"`);
    exportData[table] = rowsRes.rows;
    recordCounts[table] = rowsRes.rows.length;
    totalRecords += rowsRes.rows.length;
  }

  // 4. Deterministic serialization & Checksum
  const plainJson = canonicalize(exportData);
  const plainSha256 = crypto.createHash('sha256').update(plainJson).digest('hex');

  // 5. AES-256-GCM Encryption
  const derivedKey = deriveKey(encryptionKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  
  let ciphertext = cipher.update(plainJson, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  const manifest: BackupManifest = {
    backupId,
    timestamp: new Date().toISOString(),
    environment: envMode,
    schemaVersion,
    tableCount: tablesToExport.length,
    totalRecords,
    recordCounts,
    plainSha256,
    encryptionAlgorithm: 'aes-256-gcm',
  };

  const backupPackage: EncryptedBackupPackage = {
    manifest,
    encryption: {
      iv: iv.toString('base64'),
      authTag,
    },
    ciphertext,
  };

  const evidenceHash = computeBackupEvidenceHash(manifest, ciphertext);

  // 6. Record audit event
  try {
    await pool.query(
      `INSERT INTO audit_events (action, target_reference, source, details, actor_account_id)
       VALUES ($1, $2, 'backup_service', $3, $4)`,
      [
        'backup_created',
        `backup:${backupId}`,
        JSON.stringify({ backupId, schemaVersion, totalRecords, evidenceHash, environment: envMode }),
        operatorAccountId || null,
      ]
    );
  } catch {
    // Audit table might not exist in early tests
  }

  return { backupPackage, evidenceHash };
}

export async function rehearseRestore(options: {
  targetPool: Pool;
  backupPackage: EncryptedBackupPackage;
  encryptionKey: string;
  targetEnvironment?: RuntimeMode;
  operatorAccountId?: string;
  simulateFailure?: boolean;
  cleanTarget?: boolean;
}): Promise<RestoreEvidence> {
  const { targetPool, backupPackage, encryptionKey, operatorAccountId, simulateFailure, cleanTarget = true } = options;
  const targetEnv = options.targetEnvironment || (process.env.EBUHAY_MODE as RuntimeMode) || 'synthetic';
  const startTime = Date.now();
  const restoreId = crypto.randomUUID();

  // 1. Prohibit cross-boundary restore: synthetic backup into live environment
  if (backupPackage.manifest.environment === 'synthetic' && isLiveMode(targetEnv)) {
    throw new Error('Prohibited cross-boundary restore: synthetic backup cannot be restored into live environment');
  }

  // 2. Decrypt payload
  let plainJson: string;
  try {
    const derivedKey = deriveKey(encryptionKey);
    const iv = Buffer.from(backupPackage.encryption.iv, 'base64');
    const authTag = Buffer.from(backupPackage.encryption.authTag, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);

    plainJson = decipher.update(backupPackage.ciphertext, 'base64', 'utf8');
    plainJson += decipher.final('utf8');
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errMessage = error instanceof Error ? error.message : String(error);
    const evidenceHash = computeRestoreEvidenceHash({
      backupId: backupPackage.manifest.backupId,
      status: 'safe_rollback',
      schemaVersion: backupPackage.manifest.schemaVersion,
      recordsRestored: 0,
      tablesRestored: {},
      targetEnvironment: targetEnv,
    });

    try {
      await targetPool.query(`
        INSERT INTO continuity_evidence 
          (id, backup_id, rehearsal_type, status, target_environment, schema_version, 
           tables_restored, records_restored, duration_ms, evidence_hash, operator_account_id, 
           safe_fallback_active, error_details)
        VALUES ($1, $2, 'restore_rehearsal', 'safe_rollback', $3, $4, '{}', 0, $5, $6, $7, true, $8)
      `, [restoreId, backupPackage.manifest.backupId, targetEnv, backupPackage.manifest.schemaVersion, durationMs, evidenceHash, operatorAccountId || null, `Decryption failed: ${errMessage}`]);
    } catch {
      // Ignored if table not available
    }

    throw new Error(`Backup decryption failed: ${errMessage}`);
  }

  // 3. Integrity verification: Checksum
  const computedSha256 = crypto.createHash('sha256').update(plainJson).digest('hex');
  if (computedSha256 !== backupPackage.manifest.plainSha256) {
    const durationMs = Date.now() - startTime;
    const evidenceHash = computeRestoreEvidenceHash({
      backupId: backupPackage.manifest.backupId,
      status: 'safe_rollback',
      schemaVersion: backupPackage.manifest.schemaVersion,
      recordsRestored: 0,
      tablesRestored: {},
      targetEnvironment: targetEnv,
    });

    try {
      await targetPool.query(`
        INSERT INTO continuity_evidence 
          (id, backup_id, rehearsal_type, status, target_environment, schema_version, 
           tables_restored, records_restored, duration_ms, evidence_hash, operator_account_id, 
           safe_fallback_active, error_details)
        VALUES ($1, $2, 'restore_rehearsal', 'safe_rollback', $3, $4, '{}', 0, $5, $6, $7, true, $8)
      `, [restoreId, backupPackage.manifest.backupId, targetEnv, backupPackage.manifest.schemaVersion, durationMs, evidenceHash, operatorAccountId || null, 'Checksum mismatch']);
    } catch {
      // Ignored if table not available
    }

    throw new Error('Backup integrity verification failed: checksum mismatch');
  }

  const dumpData = JSON.parse(plainJson) as Record<string, any[]>;
  const client: PoolClient = await targetPool.connect();

  try {
    await client.query('BEGIN');

    if (simulateFailure) {
      throw new Error('Simulated restore failure for rollback testing');
    }

    // Clean target tables in reverse dependency order if requested
    if (cleanTarget) {
      const reverseOrder = [...DEPENDENCY_TABLE_ORDER].reverse();
      for (const table of reverseOrder) {
        if (dumpData[table] !== undefined) {
          await client.query(`DELETE FROM "${table}"`);
        }
      }
    }

    // Restore rows in dependency order
    const restoredCounts: Record<string, number> = {};
    let totalRestored = 0;

    for (const table of DEPENDENCY_TABLE_ORDER) {
      const rows = dumpData[table];
      if (!rows || rows.length === 0) continue;

      restoredCounts[table] = 0;
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      if (columns.length === 0) continue;
      const colNames = columns.map(c => `"${c}"`).join(', ');

      const chunkSize = 25;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valuePlaceholders: string[] = [];
        const flatValues: any[] = [];

        for (let r = 0; r < chunk.length; r++) {
          const row = chunk[r];
          const placeholders: string[] = [];
          for (let c = 0; c < columns.length; c++) {
            const col = columns[c];
            const v = row[col];
            if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
              flatValues.push(JSON.stringify(v));
            } else {
              flatValues.push(v);
            }
            placeholders.push(`$${flatValues.length}`);
          }
          valuePlaceholders.push(`(${placeholders.join(', ')})`);
        }

        try {
          await client.query(
            `INSERT INTO "${table}" (${colNames}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT DO NOTHING`,
            flatValues
          );
        } catch (tableErr: any) {
          throw new Error(`Failed restoring table "${table}" (columns: ${colNames}): ${tableErr.message}`);
        }
        restoredCounts[table] += chunk.length;
        totalRestored += chunk.length;
      }
    }

    // Post-restore verification: ensure schema migration matches
    const targetSchemaRes = await client.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
    const targetSchemaVersion = targetSchemaRes.rows[0]?.version || '';
    if (targetSchemaVersion !== backupPackage.manifest.schemaVersion) {
      throw new Error(`Restored schema version mismatch: expected ${backupPackage.manifest.schemaVersion}, got ${targetSchemaVersion}`);
    }

    await client.query('COMMIT');

    const durationMs = Date.now() - startTime;
    const evidenceHash = computeRestoreEvidenceHash({
      backupId: backupPackage.manifest.backupId,
      status: 'success',
      schemaVersion: targetSchemaVersion,
      recordsRestored: totalRestored,
      tablesRestored: restoredCounts,
      targetEnvironment: targetEnv,
    });

    const evidenceRes = await client.query(`
      INSERT INTO continuity_evidence 
        (id, backup_id, rehearsal_type, status, target_environment, schema_version, 
         tables_restored, records_restored, duration_ms, evidence_hash, operator_account_id, 
         safe_fallback_active)
      VALUES ($1, $2, 'restore_rehearsal', 'success', $3, $4, $5, $6, $7, $8, $9, false)
      RETURNING *
    `, [
      restoreId,
      backupPackage.manifest.backupId,
      targetEnv,
      targetSchemaVersion,
      JSON.stringify(restoredCounts),
      totalRestored,
      durationMs,
      evidenceHash,
      operatorAccountId || null,
    ]);

    try {
      await client.query(
        `INSERT INTO audit_events (action, target_reference, source, details, actor_account_id)
         VALUES ('restore_rehearsal_completed', $1, 'backup_service', $2, $3)`,
        [
          `restore:${restoreId}`,
          JSON.stringify({ restoreId, backupId: backupPackage.manifest.backupId, durationMs, totalRestored, evidenceHash }),
          operatorAccountId || null,
        ]
      );
    } catch {}

    const row = evidenceRes.rows[0];
    return {
      id: row.id,
      backupId: row.backup_id,
      rehearsalType: row.rehearsal_type,
      status: row.status,
      targetEnvironment: row.target_environment,
      schemaVersion: row.schema_version,
      tablesRestored: row.tables_restored,
      recordsRestored: row.records_restored,
      durationMs: row.duration_ms,
      evidenceHash: row.evidence_hash,
      safeFallbackActive: row.safe_fallback_active,
      operatorAccountId: row.operator_account_id,
      errorDetails: row.error_details,
      recordedAt: row.recorded_at.toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');

    const durationMs = Date.now() - startTime;
    const errMessage = error instanceof Error ? error.message : String(error);
    const evidenceHash = computeRestoreEvidenceHash({
      backupId: backupPackage.manifest.backupId,
      status: 'safe_rollback',
      schemaVersion: backupPackage.manifest.schemaVersion,
      recordsRestored: 0,
      tablesRestored: {},
      targetEnvironment: targetEnv,
    });

    const evidenceRes = await client.query(`
      INSERT INTO continuity_evidence 
        (id, backup_id, rehearsal_type, status, target_environment, schema_version, 
         tables_restored, records_restored, duration_ms, evidence_hash, operator_account_id, 
         safe_fallback_active, error_details)
      VALUES ($1, $2, 'rollback_test', 'safe_rollback', $3, $4, '{}', 0, $5, $6, $7, true, $8)
      RETURNING *
    `, [
      restoreId,
      backupPackage.manifest.backupId,
      targetEnv,
      backupPackage.manifest.schemaVersion,
      durationMs,
      evidenceHash,
      operatorAccountId || null,
      errMessage,
    ]);

    try {
      await client.query(
        `INSERT INTO audit_events (action, target_reference, source, details, actor_account_id)
         VALUES ('restore_rollback_executed', $1, 'backup_service', $2, $3)`,
        [
          `restore:${restoreId}`,
          JSON.stringify({ restoreId, backupId: backupPackage.manifest.backupId, error: errMessage, safeRollback: true }),
          operatorAccountId || null,
        ]
      );
    } catch {}

    const row = evidenceRes.rows[0];
    return {
      id: row.id,
      backupId: row.backup_id,
      rehearsalType: row.rehearsal_type,
      status: row.status,
      targetEnvironment: row.target_environment,
      schemaVersion: row.schema_version,
      tablesRestored: row.tables_restored || {},
      recordsRestored: row.records_restored || 0,
      durationMs: row.duration_ms,
      evidenceHash: row.evidence_hash,
      safeFallbackActive: true,
      operatorAccountId: row.operator_account_id,
      errorDetails: errMessage,
      recordedAt: row.recorded_at.toISOString(),
    };
  } finally {
    client.release();
  }
}

export async function listContinuityEvidence(pool: Pool): Promise<RestoreEvidence[]> {
  const res = await pool.query('SELECT * FROM continuity_evidence ORDER BY recorded_at DESC');
  return res.rows.map(row => ({
    id: row.id,
    backupId: row.backup_id,
    rehearsalType: row.rehearsal_type,
    status: row.status,
    targetEnvironment: row.target_environment,
    schemaVersion: row.schema_version,
    tablesRestored: row.tables_restored,
    recordsRestored: row.records_restored,
    durationMs: row.duration_ms,
    evidenceHash: row.evidence_hash,
    safeFallbackActive: row.safe_fallback_active,
    operatorAccountId: row.operator_account_id,
    errorDetails: row.error_details,
    recordedAt: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : String(row.recorded_at),
  }));
}
