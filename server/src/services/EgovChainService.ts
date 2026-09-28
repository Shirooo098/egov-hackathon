import { createHash, randomBytes } from 'node:crypto';

export const EGOVCHAIN_CHAIN_ID = 13371;
export const ALLOWED_RPC_METHODS = ['eth_chainId', 'eth_gasPrice', 'eth_blockNumber', 'eth_getBlockByNumber'] as const;
export type AllowedRpcMethod = (typeof ALLOWED_RPC_METHODS)[number];

const timeoutMs = 10_000;
const HEX_QUANTITY_REGEX = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]{0,63})$/;
const HASH_32BYTE_REGEX = /^0x[0-9a-fA-F]{64}$/;

export type ConsentCommitmentInput = {
  targetId: string;
  actorId: string;
  action: 'grant' | 'withdraw';
  purpose: string;
  version: string;
  scope: string;
  evidence: string;
  idempotencyKey: string;
};

export function consentCommitment(input: ConsentCommitmentInput, salt = randomBytes(16).toString('hex')) {
  const canonical = JSON.stringify({ ...input, salt });
  return { commitment: createHash('sha256').update(canonical).digest('hex'), salt };
}

function configured(): boolean {
  if (process.env.EBUHAY_MODE !== 'synthetic' || process.env.EGOVCHAIN_MODE !== 'staging') return false;
  return Boolean(process.env.EGOVCHAIN_RPC_BASE_URL?.trim() && process.env.EGOVCHAIN_RPC_TOKEN?.trim());
}

export function egovchainEnabled(): boolean {
  return configured();
}

export function publicConsentEvent(row: Record<string, unknown>, _enabled: boolean): Record<string, unknown> & { anchorStatus: string; historical?: boolean } {
  const { outboxStatus, outboxErrorCode, anchorStatus, ...event } = row;
  if (anchorStatus === 'verified' || anchorStatus === 'failed') {
    return { ...event, anchorStatus: 'historical', historicalAnchorStatus: anchorStatus, historical: true };
  }
  return { ...event, anchorStatus: 'deferred' };
}

export async function rpc(method: string, params: unknown[] = []): Promise<unknown> {
  if (!ALLOWED_RPC_METHODS.includes(method as AllowedRpcMethod)) throw new Error('egovchain_unsupported_method');
  const blockLookup = method === 'eth_getBlockByNumber';
  if (!Array.isArray(params) || (blockLookup
    ? params.length !== 2 || typeof params[0] !== 'string' || !HEX_QUANTITY_REGEX.test(params[0]) || params[1] !== false
    : params.length !== 0)) throw new Error('egovchain_invalid_params');
  if (!configured()) throw new Error('egovchain_disabled');

  let targetUrl: URL;
  try {
    const base = new URL(process.env.EGOVCHAIN_RPC_BASE_URL!.trim());
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error();
    targetUrl = new URL(`${base.toString().replace(/\/+$/, '')}/${encodeURIComponent(process.env.EGOVCHAIN_RPC_TOKEN!.trim())}`);
  } catch { throw new Error('egovchain_invalid_url'); }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        redirect: 'error', signal: controller.signal,
      });
    } catch {
      throw new Error(controller.signal.aborted ? 'egovchain_timeout' : 'egovchain_network_error');
    }
    if (!response.ok) {
      throw new Error(response.status === 401 || response.status === 403 ? 'egovchain_auth_failed' : `egovchain_http_${response.status}`);
    }
    let body: unknown;
    try { body = await response.json(); }
    catch { throw new Error(controller.signal.aborted ? 'egovchain_timeout' : 'egovchain_malformed_response'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('egovchain_malformed_response');
    const envelope = body as Record<string, unknown>;
    if (envelope.jsonrpc !== '2.0' || envelope.id !== 1) throw new Error('egovchain_malformed_response');
    if ('error' in envelope) throw new Error('egovchain_rpc_error');
    const result = envelope.result;
    if (blockLookup) {
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('egovchain_malformed_response');
      const block = result as Record<string, unknown>;
      if (typeof block.number !== 'string' || !HEX_QUANTITY_REGEX.test(block.number) ||
          typeof block.hash !== 'string' || !HASH_32BYTE_REGEX.test(block.hash) ||
          BigInt(block.number) !== BigInt(params[0] as string)) throw new Error('egovchain_malformed_response');
      return { number: block.number, hash: block.hash };
    }
    if (typeof result !== 'string' || !HEX_QUANTITY_REGEX.test(result)) throw new Error('egovchain_malformed_response');
    if (method === 'eth_chainId' && BigInt(result) !== BigInt(EGOVCHAIN_CHAIN_ID)) throw new Error('egovchain_wrong_chain');
    if (method === 'eth_gasPrice' && BigInt(result) !== 0n) throw new Error('egovchain_nonzero_gas');
    return result;
  } finally { clearTimeout(timer); }
}
export type EgovChainObservation = {
  ok: true;
  chainId: number;
  gasPrice: string;
  blockNumber: string;
  blockHash: string;
  observedAt: string;
};

export async function checkEgovChainReadonly(): Promise<EgovChainObservation> {
  const chainIdHex = String(await rpc('eth_chainId'));
  const gasPriceHex = String(await rpc('eth_gasPrice'));
  const blockNumberHex = String(await rpc('eth_blockNumber'));
  const block = (await rpc('eth_getBlockByNumber', [blockNumberHex, false])) as { number: string; hash: string };
  return {
    ok: true,
    chainId: Number(BigInt(chainIdHex)),
    gasPrice: gasPriceHex,
    blockNumber: block.number,
    blockHash: block.hash,
    observedAt: new Date().toISOString(),
  };
}
