import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const KEY_VERSION = 1;

function keyFromEnvironment(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env.STAFF_MFA_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error('STAFF_MFA_ENCRYPTION_KEY is required');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('STAFF_MFA_ENCRYPTION_KEY must encode exactly 32 bytes');
  return key;
}

function encryptSecret(secret: string, key = keyFromEnvironment()): { ciphertext: Buffer; iv: Buffer; authTag: Buffer; keyVersion: number } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion: KEY_VERSION };
}

function decryptSecret(ciphertext: Buffer, iv: Buffer, authTag: Buffer, key = keyFromEnvironment()): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function base32Decode(input: string): Buffer {
  const value = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0; let buffer = 0; const out: number[] = [];
  for (const char of value) { const n = ALPHABET.indexOf(char); if (n < 0) throw new Error('Invalid TOTP secret'); buffer = (buffer << 5) | n; bits += 5; if (bits >= 8) { bits -= 8; out.push((buffer >> bits) & 255); } }
  return Buffer.from(out);
}
function base32Encode(input: Buffer): string { let bits = 0; let buffer = 0; let out = ''; for (const byte of input) { buffer = (buffer << 8) | byte; bits += 8; while (bits >= 5) { bits -= 5; out += ALPHABET[(buffer >> bits) & 31]; } } if (bits) out += ALPHABET[(buffer << (5 - bits)) & 31]; return out; }
function totpAt(secret: string, counter: number): string {
  const data = Buffer.alloc(8); data.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(data).digest();
  const offset = digest[digest.length - 1] & 15; const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, '0');
}
function verifyTotp(secret: string, supplied: unknown, nowMs = Date.now(), window = 1): number | null {
  if (typeof supplied !== 'string' || !/^\d{6}$/.test(supplied)) return null;
  const current = Math.floor(nowMs / 30_000);
  for (let delta = -window; delta <= window; delta++) { const counter = current + delta; if (counter >= 0 && crypto.timingSafeEqual(Buffer.from(totpAt(secret, counter)), Buffer.from(supplied))) return counter; }
  return null;
}
function generateTotp(secret: string, nowMs = Date.now()): string { return totpAt(secret, Math.floor(nowMs / 30_000)); }
function createEnrollmentSecret(random = crypto.randomBytes(20)): string { return base32Encode(random); }
function createRecoveryCodes(count = 10, random: () => Buffer = () => crypto.randomBytes(18)): string[] { return Array.from({ length: count }, () => random().toString('base64url')); }
function hashRecoveryCode(code: string): Buffer { return crypto.createHash('sha256').update(code).digest(); }

export { KEY_VERSION, keyFromEnvironment, encryptSecret, decryptSecret, createEnrollmentSecret, generateTotp, verifyTotp, createRecoveryCodes, hashRecoveryCode, base32Encode };
