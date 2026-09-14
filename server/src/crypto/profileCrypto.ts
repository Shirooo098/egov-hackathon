import crypto from 'node:crypto';
import type { RuntimeMode } from '../runtime/config.js';
import { isLiveMode } from '../runtime/config.js';

export type CitizenProfileData = {
  fullName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  residentialAddress?: string | null;
  dateOfBirth?: string | null;
  sex?: string | null;
};

export type EncryptedProfileRecord = {
  encryptedPayload: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyId: string;
  environmentMode: string;
  version?: number;
};

// Default synthetic keys for synthetic mode testing & rotation demo
const DEFAULT_SYNTHETIC_KEYS: Record<string, Buffer> = {
  'synth-2026-v1': crypto.createHash('sha256').update('ebuhay-synthetic-profile-encryption-v1-2026').digest(),
  'synth-2026-v2': crypto.createHash('sha256').update('ebuhay-synthetic-profile-encryption-v2-2026').digest(),
};

export function parseKeyRing(raw: string | undefined): Record<string, Buffer> {
  if (!raw) return {};
  const keys: Record<string, Buffer> = {};
  const entries = raw.split(',').map((e) => e.trim()).filter(Boolean);
  for (const entry of entries) {
    const [keyId, keyVal] = entry.split(':');
    if (!keyId || !keyVal) continue;
    let buf: Buffer;
    if (/^[0-9a-fA-F]{64}$/.test(keyVal)) {
      buf = Buffer.from(keyVal, 'hex');
    } else {
      buf = Buffer.from(keyVal, 'base64');
    }
    if (buf.length === 32) {
      keys[keyId.trim()] = buf;
    }
  }
  return keys;
}

export function getKeyRingForMode(mode: RuntimeMode): { activeKeyId: string; keys: Record<string, Buffer> } {
  if (isLiveMode(mode)) {
    const liveKeys = parseKeyRing(process.env.LIVE_ENCRYPTION_KEY_RING || process.env.EBUHAY_LIVE_KEYS);
    const activeKeyId = process.env.LIVE_ACTIVE_KEY_ID || Object.keys(liveKeys)[0];
    if (!activeKeyId || !liveKeys[activeKeyId] || liveKeys[activeKeyId].length !== 32) {
      throw new Error('Live modes require managed live encryption keys (LIVE_ENCRYPTION_KEY_RING with 256-bit keys)');
    }
    // Prevent synthetic key IDs in live mode
    if (activeKeyId.startsWith('synth-')) {
      throw new Error('Synthetic key IDs cannot be used in live mode');
    }
    return { activeKeyId, keys: liveKeys };
  }

  // Synthetic mode
  const customSynthetic = parseKeyRing(process.env.SYNTHETIC_ENCRYPTION_KEY_RING);
  const keys = { ...DEFAULT_SYNTHETIC_KEYS, ...customSynthetic };
  const activeKeyId = process.env.SYNTHETIC_ACTIVE_KEY_ID || 'synth-2026-v1';
  if (!keys[activeKeyId]) {
    throw new Error(`Synthetic active key ${activeKeyId} not found in key ring`);
  }
  return { activeKeyId, keys };
}

/**
 * Encrypts a minimal citizen profile using AES-256-GCM.
 */
export function encryptProfile(
  profile: CitizenProfileData,
  mode: RuntimeMode,
  overrideKeyId?: string
): EncryptedProfileRecord {
  const { activeKeyId, keys } = getKeyRingForMode(mode);
  const keyId = overrideKeyId || activeKeyId;
  const key = keys[keyId];
  if (!key || key.length !== 32) {
    throw new Error(`Encryption key ${keyId} not found or invalid for mode ${mode}`);
  }

  // Strict mode isolation check
  if (isLiveMode(mode) && keyId.startsWith('synth-')) {
    throw new Error('Synthetic keys are prohibited in live modes');
  }
  if (!isLiveMode(mode) && keyId.startsWith('live-')) {
    throw new Error('Live keys are prohibited in synthetic mode');
  }

  const iv = crypto.randomBytes(12);
  const plaintext = Buffer.from(JSON.stringify(profile), 'utf8');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encryptedPayload = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedPayload,
    iv,
    authTag,
    keyId,
    environmentMode: mode,
  };
}

/**
 * Decrypts an encrypted citizen profile.
 */
export function decryptProfile(
  record: EncryptedProfileRecord,
  mode: RuntimeMode
): CitizenProfileData {
  if (record.environmentMode !== mode) {
    throw new Error(`Cross-environment decryption prohibited: record is ${record.environmentMode} but current mode is ${mode}`);
  }

  const { keys } = getKeyRingForMode(mode);
  const key = keys[record.keyId];
  if (!key || key.length !== 32) {
    throw new Error(`Decryption key not available for keyId: ${record.keyId}`);
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, record.iv);
  decipher.setAuthTag(record.authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(record.encryptedPayload), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as CitizenProfileData;
  } catch (err) {
    throw new Error('Ciphertext authentication failed (tampering detected or invalid key)');
  }
}

/**
 * Re-encrypts an existing encrypted profile under a new key ID (Key Rotation).
 */
export function rotateProfileRecord(
  record: EncryptedProfileRecord,
  newKeyId: string,
  mode: RuntimeMode
): EncryptedProfileRecord {
  const decrypted = decryptProfile(record, mode);
  const reencrypted = encryptProfile(decrypted, mode, newKeyId);
  return {
    ...reencrypted,
    version: (record.version ?? 1) + 1,
  };
}
