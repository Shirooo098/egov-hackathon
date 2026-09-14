import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { requireSession, requireRole } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import type { RuntimeConfig, RuntimeMode } from '../runtime/config.js';
import {
  encryptProfile,
  decryptProfile,
  rotateProfileRecord,
  type CitizenProfileData,
  type EncryptedProfileRecord,
} from '../crypto/profileCrypto.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function createProfileRouter(config: RuntimeConfig) {
  const router = express.Router();
  const db = () => getDb();
  const mode = config.mode;

  // GET /profile - Retrieve authenticated citizen's decrypted profile
  router.get('/', requireSession, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required' });
      if (account.role !== 'citizen') {
        return res.status(403).json({ success: false, error: 'forbidden', message: 'Profile access reserved for citizens' });
      }

      const result = await db().execute(sql`
        SELECT id, account_id AS "accountId", encrypted_payload AS "encryptedPayload",
               iv, auth_tag AS "authTag", key_id AS "keyId", environment_mode AS "environmentMode",
               version, updated_at AS "updatedAt"
        FROM citizen_profiles
        WHERE account_id = ${account.id}
      `);

      if (!result.rowCount) {
        return res.json({ success: true, data: { profile: null } });
      }

      const row = result.rows[0] as unknown as EncryptedProfileRecord & {
        id: string;
        accountId: string;
        version: number;
        updatedAt: Date;
      };

      const decrypted = decryptProfile(row, mode);

      // Audit read access (least privilege, zero-leak: never log plaintext values)
      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${account.id}, 'profile_read', ${account.id}, 'protected-profile',
                ${JSON.stringify({ purpose: 'citizen_self_view', keyId: row.keyId, version: row.version })})
      `);

      return res.json({
        success: true,
        data: {
          profile: {
            id: row.id,
            accountId: row.accountId,
            ...decrypted,
            keyId: row.keyId,
            version: row.version,
            updatedAt: row.updatedAt,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // PUT /profile - Update and encrypt citizen profile
  router.put('/', requireSession, requireSameOrigin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required' });
      if (account.role !== 'citizen') {
        return res.status(403).json({ success: false, error: 'forbidden', message: 'Profile update reserved for citizens' });
      }

      const { fullName, contactEmail, contactPhone, residentialAddress, dateOfBirth, sex } = req.body || {};

      if (contactEmail !== undefined && contactEmail !== null && (typeof contactEmail !== 'string' || !EMAIL_REGEX.test(contactEmail))) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid contactEmail format' });
      }
      if (contactPhone !== undefined && contactPhone !== null && (typeof contactPhone !== 'string' || !PHONE_REGEX.test(contactPhone))) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid contactPhone format (E.164 required, e.g. +639XXXXXXXXX)' });
      }
      if (dateOfBirth !== undefined && dateOfBirth !== null && (typeof dateOfBirth !== 'string' || !DATE_REGEX.test(dateOfBirth))) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid dateOfBirth format (YYYY-MM-DD required)' });
      }

      const profileData: CitizenProfileData = {
        fullName: typeof fullName === 'string' ? fullName.trim().slice(0, 200) : null,
        contactEmail: typeof contactEmail === 'string' ? contactEmail.trim().toLowerCase() : null,
        contactPhone: typeof contactPhone === 'string' ? contactPhone.trim() : null,
        residentialAddress: typeof residentialAddress === 'string' ? residentialAddress.trim().slice(0, 500) : null,
        dateOfBirth: typeof dateOfBirth === 'string' ? dateOfBirth.trim() : null,
        sex: typeof sex === 'string' ? sex.trim().slice(0, 20) : null,
      };

      const encrypted = encryptProfile(profileData, mode);

      const result = await db().execute(sql`
        INSERT INTO citizen_profiles(account_id, encrypted_payload, iv, auth_tag, key_id, environment_mode, version, updated_at)
        VALUES (${account.id}, ${encrypted.encryptedPayload}, ${encrypted.iv}, ${encrypted.authTag}, ${encrypted.keyId}, ${mode}, 1, now())
        ON CONFLICT (account_id) DO UPDATE SET
          encrypted_payload = EXCLUDED.encrypted_payload,
          iv = EXCLUDED.iv,
          auth_tag = EXCLUDED.auth_tag,
          key_id = EXCLUDED.key_id,
          environment_mode = EXCLUDED.environment_mode,
          version = citizen_profiles.version + 1,
          updated_at = now()
        RETURNING id, version, key_id AS "keyId", updated_at AS "updatedAt"
      `);

      const saved = result.rows[0] as { id: string; version: number; keyId: string; updatedAt: Date };

      // Audit profile mutation (append-only, zero-leak)
      const fieldsUpdated = Object.keys(profileData).filter((k) => profileData[k as keyof CitizenProfileData] !== null);
      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${account.id}, 'profile_updated', ${account.id}, 'protected-profile',
                ${JSON.stringify({ fields: fieldsUpdated, keyId: saved.keyId, version: saved.version })})
      `);

      return res.json({
        success: true,
        data: {
          profile: {
            id: saved.id,
            accountId: account.id,
            ...profileData,
            keyId: saved.keyId,
            version: saved.version,
            updatedAt: saved.updatedAt,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // POST /profile/rotate-keys - Operator endpoint to re-encrypt records under a new key ID
  router.post('/rotate-keys', requireSession, requireSameOrigin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account || (account.role !== 'hospital_admin' && account.role !== 'clinical_lead')) {
        return res.status(403).json({ success: false, error: 'forbidden', message: 'Key rotation requires administrative privileges' });
      }

      const { targetKeyId } = req.body || {};
      if (typeof targetKeyId !== 'string' || !targetKeyId.trim()) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'targetKeyId is required' });
      }

      const rows = await db().execute(sql`
        SELECT id, account_id AS "accountId", encrypted_payload AS "encryptedPayload",
               iv, auth_tag AS "authTag", key_id AS "keyId", environment_mode AS "environmentMode", version
        FROM citizen_profiles
        WHERE key_id != ${targetKeyId} AND environment_mode = ${mode}
      `);

      let rotatedCount = 0;
      for (const rawRow of rows.rows) {
        const row = rawRow as unknown as EncryptedProfileRecord & { id: string; accountId: string; version: number };
        const rotated = rotateProfileRecord(row, targetKeyId, mode);

        await db().execute(sql`
          UPDATE citizen_profiles
          SET encrypted_payload = ${rotated.encryptedPayload},
              iv = ${rotated.iv},
              auth_tag = ${rotated.authTag},
              key_id = ${rotated.keyId},
              version = version + 1,
              updated_at = now()
          WHERE id = ${row.id}
        `);

        await db().execute(sql`
          INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
          VALUES (${account.id}, 'profile_key_rotated', ${row.accountId}, 'protected-profile',
                  ${JSON.stringify({ previousKeyId: row.keyId, newKeyId: targetKeyId, previousVersion: row.version })})
        `);
        rotatedCount += 1;
      }

      return res.json({
        success: true,
        data: {
          rotatedCount,
          targetKeyId,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createProfileRouter;
