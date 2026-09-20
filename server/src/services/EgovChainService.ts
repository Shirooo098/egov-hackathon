import { Wallet, keccak256 } from 'ethers';
import { createHash, randomBytes } from 'node:crypto';

export const EGOVCHAIN_CHAIN_ID = 13371;
const timeoutMs = 10_000;

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

function configured() {
  if (process.env.EBUHAY_MODE !== 'synthetic' || process.env.EGOVCHAIN_MODE !== 'staging') return false;
  return Boolean(process.env.EGOVCHAIN_RPC_BASE_URL && process.env.EGOVCHAIN_RPC_TOKEN && process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY);
}

export function egovchainEnabled() { return configured(); }
export function signerAddress() {
  if (!process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY) throw new Error('egovchain_disabled');
  return new Wallet(process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY).address;
}

export async function signConsentTransaction(commitment: string, nonce: number) {
  if (!configured()) throw new Error('egovchain_disabled');
  const wallet = new Wallet(process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY!);
  const chainId = Number(BigInt(String(await rpc('eth_chainId'))));
  if (chainId !== EGOVCHAIN_CHAIN_ID) throw new Error('egovchain_wrong_chain');
  const gasPrice = BigInt(String(await rpc('eth_gasPrice')));
  if (gasPrice !== 0n) throw new Error('egovchain_nonzero_gas');
  const data = `0x${commitment}`;
  const gasLimit = BigInt(String(await rpc('eth_estimateGas', [{ from: wallet.address, to: wallet.address, value: '0x0', data }])));
  const raw = await wallet.signTransaction({
    type: 0,
    to: wallet.address,
    value: 0n,
    data,
    nonce,
    chainId: EGOVCHAIN_CHAIN_ID,
    gasPrice: 0n,
    gasLimit,
  });
  return { raw, txHash: keccak256(raw), from: wallet.address };
}

export async function rpc(method: string, params: unknown[] = []) {
  if (!configured()) throw new Error('egovchain_disabled');
  const base = `${process.env.EGOVCHAIN_RPC_BASE_URL!.replace(/\/$/, '')}/${process.env.EGOVCHAIN_RPC_TOKEN!}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: controller.signal });
    const body = await response.json() as { result?: unknown; error?: { code?: number } };
    if (!response.ok || body.error) throw new Error(`egovchain_rpc_${body.error?.code ?? response.status}`);
    return body.result;
  } finally { clearTimeout(timer); }
}

export async function broadcast(raw: string) { return String(await rpc('eth_sendRawTransaction', [raw])); }

export async function receipt(txHash: string) { return await rpc('eth_getTransactionReceipt', [txHash]) as { status?: string; blockHash?: string; blockNumber?: string; transactionHash?: string } | null; }

export async function verifyReceipt(txHash: string, commitment: string) {
  const r = await receipt(txHash);
  if (!r || !['0x1', '0x0'].includes(r.status ?? '') || !r.blockHash || !r.blockNumber) return null;
  const [tx, block] = await Promise.all([
    rpc('eth_getTransactionByHash', [txHash]) as Promise<{ from?: string; to?: string; value?: string; input?: string; chainId?: string; hash?: string } | null>,
    rpc('eth_getBlockByNumber', [r.blockNumber, false]) as Promise<{ hash?: string; transactions?: string[] } | null>,
  ]);
  const address = signerAddress().toLowerCase();
  if (!tx || !block || block.hash?.toLowerCase() !== r.blockHash.toLowerCase() || !block.transactions?.some((hash) => hash.toLowerCase() === txHash.toLowerCase()) || tx.hash?.toLowerCase() !== txHash.toLowerCase() || tx.from?.toLowerCase() !== address || tx.to?.toLowerCase() !== address || BigInt(tx.value ?? '0x0') !== 0n || tx.input?.toLowerCase() !== `0x${commitment}`.toLowerCase() || Number(BigInt(tx.chainId ?? '0x0')) !== EGOVCHAIN_CHAIN_ID) return null;
  return r;
}
