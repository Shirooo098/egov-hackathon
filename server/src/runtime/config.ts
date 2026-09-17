export const RUNTIME_MODES = ['synthetic', 'partner-sandbox', 'controlled-live', 'production'] as const;
export type RuntimeMode = (typeof RUNTIME_MODES)[number];

export const SERVICE_CODES = ['blood', 'living-kidney', 'deceased-kidney'] as const;
export type ServiceCode = (typeof SERVICE_CODES)[number];

export type RuntimeConfig = {
  mode: RuntimeMode;
  databaseUrl: string;
  directDatabaseUrl?: string;
  port: number;
  shutdownTimeoutMs: number;
  approvedService?: 'blood';
  allowedOrigins: string[];
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
};

export class RuntimeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

const positiveInt = (name: string, value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new RuntimeConfigError(`${name} must be a positive integer`);
  return parsed;
};

function parseOrigins(raw: string | undefined, mode: RuntimeMode): string[] {
  if (isLiveMode(mode) && raw === undefined) {
    throw new RuntimeConfigError('ALLOWED_ORIGINS is required in live modes');
  }
  const values = (raw ?? 'http://localhost:3000,http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
  if (values.length === 0) throw new RuntimeConfigError('ALLOWED_ORIGINS must contain at least one origin');
  for (const origin of values) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new RuntimeConfigError('ALLOWED_ORIGINS contains an invalid origin'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) {
      throw new RuntimeConfigError('ALLOWED_ORIGINS must contain HTTP(S) origins only');
    }
    // Synthetic mode may use local development origins; live mode may not.
    if (isLiveMode(mode) && (parsed.protocol !== 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      throw new RuntimeConfigError('Live modes require explicit non-local HTTPS origins');
    }
  }
  return values;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const rawMode = env.EBUHAY_MODE;
  if (!rawMode || !RUNTIME_MODES.includes(rawMode as RuntimeMode)) {
    throw new RuntimeConfigError('EBUHAY_MODE must be synthetic, partner-sandbox, controlled-live, or production');
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new RuntimeConfigError('DATABASE_URL is required');
  try {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('invalid');
  } catch {
    throw new RuntimeConfigError('DATABASE_URL must be a PostgreSQL connection URL');
  }
  if (env.TEST_DATABASE_URL?.trim() && env.TEST_DATABASE_URL.trim() === databaseUrl) {
    throw new RuntimeConfigError('DATABASE_URL must be isolated from TEST_DATABASE_URL');
  }
  const directDatabaseUrl = env.DATABASE_DIRECT_URL?.trim() || undefined;
  if (directDatabaseUrl) {
    try {
      const parsed = new URL(directDatabaseUrl);
      if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('invalid');
    } catch {
      throw new RuntimeConfigError('DATABASE_DIRECT_URL must be a PostgreSQL connection URL');
    }
  }
  const approvedService = env.APPROVED_SERVICE?.trim() || undefined;
  if (approvedService !== undefined && approvedService !== 'blood') {
    throw new RuntimeConfigError('APPROVED_SERVICE must be exactly blood');
  }
  if (isLiveMode(rawMode as RuntimeMode) && approvedService !== 'blood') {
    throw new RuntimeConfigError('APPROVED_SERVICE=blood is required in live modes');
  }
  if (isLiveMode(rawMode as RuntimeMode) && (env.DEMO_MODE === 'true' || env.SYNTHETIC_MODE === 'true')) {
    throw new RuntimeConfigError('DEMO_MODE and SYNTHETIC_MODE are strictly prohibited in live modes');
  }
  return {
    mode: rawMode as RuntimeMode,
    databaseUrl,
    directDatabaseUrl,
    port: positiveInt('PORT', env.PORT, 5000),
    shutdownTimeoutMs: positiveInt('SHUTDOWN_TIMEOUT_MS', env.SHUTDOWN_TIMEOUT_MS, 10000),
    approvedService: approvedService as 'blood' | undefined,
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS, rawMode as RuntimeMode),
    rateLimitMax: positiveInt('RATE_LIMIT_MAX', env.RATE_LIMIT_MAX, 120),
    rateLimitWindowMs: positiveInt('RATE_LIMIT_WINDOW_MS', env.RATE_LIMIT_WINDOW_MS, 60_000)
  };
}

export const isLiveMode = (mode: RuntimeMode): boolean => mode === 'controlled-live' || mode === 'production';

/** Legacy adapters are synthetic doubles in demo mode and disabled in live modes. */
export function isLegacyIntegrationDisabled(mode = process.env.EBUHAY_MODE as RuntimeMode | undefined): boolean {
  return mode !== 'partner-sandbox';
}

export function isServiceAllowed(mode: RuntimeMode, service: ServiceCode): boolean {
  return SERVICE_CODES.includes(service) && (!isLiveMode(mode) || service === 'blood');
}

export function assertServiceAllowed(mode: RuntimeMode, service: ServiceCode): void {
  if (!isServiceAllowed(mode, service)) throw new RuntimeConfigError(`Service ${service} is disabled in ${mode} mode`);
}

export function isDisabledService(value: unknown): boolean {
  return typeof value === 'string' && ['kidney', 'organ', 'living-kidney', 'deceased-kidney'].includes(value.toLowerCase());
}

export function isMainModule(metaUrl: string, modulePath: string): boolean {
  return metaUrl === pathToFileURL(resolve(modulePath)).href;
}

/** Keep provider/database credentials out of process logs and HTTP responses. */
export function redactedErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, '$1[redacted]')
    .replace(/([?&](?:password|pass|secret|token|key)=)[^&\s]+/gi, '$1[redacted]');
}
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
