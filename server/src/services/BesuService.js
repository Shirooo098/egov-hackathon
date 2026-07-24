/**
 * eBuhay - DICT Hyperledger Besu Blockchain Service
 * Anchors e-signature consent hashes on zero-fee QBFT Besu chain (Chain ID 13371)
 */

const { createHash } = require('crypto');

const BESU_RPC = process.env.BESU_RPC_URL || 'https://hackathon-blockchain.e.gov.ph';
const CHAIN_ID = parseInt(process.env.BESU_CHAIN_ID || '13371', 10);
const DEMO_MODE = !process.env.PRIVATE_KEY;

/**
 * Send a JSON-RPC call to the Besu node
 */
async function rpc(method, params = []) {
  const res = await fetch(BESU_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
  });
  const data = await res.json();
  if (data.error) throw new Error(`Besu RPC error: ${data.error.message}`);
  return data.result;
}

/**
 * Get current block number
 */
async function getBlockNumber() {
  const hex = await rpc('eth_blockNumber');
  return parseInt(hex, 16);
}

/**
 * Compute SHA-256 hash of a consent document object
 */
function computeConsentHash(consentData) {
  const canonical = JSON.stringify(consentData, Object.keys(consentData).sort());
  return '0x' + createHash('sha256').update(canonical).digest('hex');
}

/**
 * Anchor a consent hash on the Besu chain
 * In demo mode, simulates a blockchain transaction using eth_call
 * @param {object} consentData - { matchId, donorId, recipientId, donorSignature, recipientSignature, timestamp }
 * @returns {{ txHash, blockNumber, consentHash, chainId, explorerUrl }}
 */
async function anchorConsent(consentData) {
  const consentHash = computeConsentHash(consentData);

  if (DEMO_MODE) {
    // Simulate a transaction hash for demo purposes
    const fakeTxHash = '0x' + createHash('sha256')
      .update(consentHash + Date.now())
      .digest('hex');

    let blockNumber;
    try {
      blockNumber = await getBlockNumber();
    } catch {
      blockNumber = 999999;
    }

    return {
      success: true,
      demo: true,
      consentHash,
      txHash: fakeTxHash,
      blockNumber,
      chainId: CHAIN_ID,
      explorerUrl: `https://hackathon-explorer.e.gov.ph/tx/${fakeTxHash}`
    };
  }

  // Production: send signed raw transaction
  // (Requires PRIVATE_KEY env var and ethers.js / web3.js in production)
  throw new Error('Live Besu signing requires PRIVATE_KEY configuration. Use demo mode for hackathon.');
}

/**
 * Get a transaction receipt from the chain
 */
async function getTransactionReceipt(txHash) {
  try {
    const receipt = await rpc('eth_getTransactionReceipt', [txHash]);
    return { success: true, receipt };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get current chain info
 */
async function getChainInfo() {
  try {
    const [chainId, blockNumber, gasPrice] = await Promise.all([
      rpc('eth_chainId'),
      rpc('eth_blockNumber'),
      rpc('eth_gasPrice')
    ]);
    return {
      chainId: parseInt(chainId, 16),
      blockNumber: parseInt(blockNumber, 16),
      gasPrice: parseInt(gasPrice, 16),
      rpcUrl: BESU_RPC,
      explorerUrl: 'https://hackathon-explorer.e.gov.ph'
    };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { computeConsentHash, anchorConsent, getTransactionReceipt, getChainInfo, getBlockNumber };
