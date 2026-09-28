import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url), quiet: true });
import { checkEgovChainReadonly, egovchainEnabled } from '../services/EgovChainService.js';

async function main() {
  if (!egovchainEnabled()) {
    console.error('eGovChain is not configured for staging (requires EBUHAY_MODE=synthetic, EGOVCHAIN_MODE=staging, EGOVCHAIN_RPC_BASE_URL, EGOVCHAIN_RPC_TOKEN)');
    process.exit(1);
  }
  try {
    const observation = await checkEgovChainReadonly();
    console.log(JSON.stringify({
      status: 'verified_readonly',
      chainId: observation.chainId,
      gasPrice: observation.gasPrice,
      blockNumber: observation.blockNumber,
      blockHash: observation.blockHash,
      observedAt: observation.observedAt,
    }, null, 2));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error && /^egovchain_[a-z0-9_]+$/.test(error.message) ? error.message : 'egovchain_unknown_error';
    console.error(`eGovChain read-only check failed: ${message}`);
    process.exit(1);
  }
}

void main();
