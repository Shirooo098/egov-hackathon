/**
 * eBuhay - DICT Hyperledger Besu Blockchain Service
 * Anchors e-signature consent hashes on zero-fee QBFT Besu chain (Chain ID 13371)
 *
 * Demo Mode: When DEMO_MODE=true or no PRIVATE_KEY is set,
 * all blockchain operations are simulated locally with no network calls.
 */

const { createHash } = require('crypto');

const BESU_RPC = process.env.BESU_RPC_URL || 'https://hackathon-blockchain.e.gov.ph';
const CHAIN_ID = parseInt(process.env.BESU_CHAIN_ID || '13371', 10);
const DEMO_MODE = process.env.DEMO_MODE === 'true' || !process.env.PRIVATE_KEY;

// Simulated block number for demo mode
let DEMO_BLOCK_NUMBER = 4821;
let DEMO_TX_COUNTER = 0;

/**
 * Simulate blockchain delay (300ms - 800ms for realistic transaction time)
 */
function simulateDelay(minMs = 300, maxMs = 800) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Generate a realistic-looking transaction hash for demo
 */
function generateTxHash() {
  // Ethereum-style transaction hash (32 bytes = 64 hex chars, prefixed with 0x)
  const hash = createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex');
  return '0x' + hash;
}

/**
 * Compute SHA-256 hash of a consent document object
 */
function computeConsentHash(consentData) {
  const canonical = JSON.stringify(consentData, Object.keys(consentData).sort());
  return '0x' + createHash('sha256').update(canonical).digest('hex');
}

/**
 * Send a JSON-RPC call to the Besu node
 * Only used in production mode
 */
async function rpc(method, params = []) {
  if (DEMO_MODE) {
    // Simulate RPC response for demo
    await simulateDelay();

    switch (method) {
      case 'eth_blockNumber':
        return '0x' + DEMO_BLOCK_NUMBER.toString(16);
      case 'eth_chainId':
        return '0x' + CHAIN_ID.toString(16);
      case 'eth_gasPrice':
        return '0x0'; // Zero gas price on testnet
      case 'eth_getTransactionReceipt':
        // Simulate successful receipt
        return {
          transactionHash: params[0],
          blockNumber: '0x' + DEMO_BLOCK_NUMBER.toString(16),
          status: '0x1',
          from: '0x1234567890123456789012345678901234567890',
          to: '0x0987654321098765432109876543210987654321',
          gasUsed: '0x5208', // 21000 gas
          logs: []
        };
      default:
        return null;
    }
  }

  // Production RPC call
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
  if (DEMO_MODE) {
    DEMO_BLOCK_NUMBER += 1; // Increment for each call to simulate progression
    return DEMO_BLOCK_NUMBER;
  }

  const hex = await rpc('eth_blockNumber');
  return parseInt(hex, 16);
}

/**
 * Anchor a consent hash on the Besu chain
 * In demo mode, simulates a blockchain transaction without network calls
 * @param {object} consentData - { matchId, donorId, recipientId, donorSignature, recipientSignature, timestamp }
 * @returns {{ txHash, blockNumber, consentHash, chainId, explorerUrl }}
 */
async function anchorConsent(consentData) {
  const consentHash = computeConsentHash(consentData);

  if (DEMO_MODE) {
    await simulateDelay(400, 700); // Simulate transaction processing time

    // Generate plausible transaction hash
    const fakeTxHash = generateTxHash();

    // Increment block number to simulate confirmation
    DEMO_BLOCK_NUMBER += 1;
    const blockNumber = DEMO_BLOCK_NUMBER;
    DEMO_TX_COUNTER++;

    // Generate plausible explorer URL
    const explorerUrl = `https://hackathon-explorer.e.gov.ph/tx/${fakeTxHash}`;

    return {
      success: true,
      demo: true,
      consentHash,
      txHash: fakeTxHash,
      blockNumber,
      chainId: CHAIN_ID,
      explorerUrl,
      timestamp: new Date().toISOString(),
      gasUsed: '0x5208', // Standard gas for simple transaction
      status: 'mined',
      confirmations: 12,
      _demo: true
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
  if (DEMO_MODE) {
    await simulateDelay(200, 500);

    // Check if it's a valid demo transaction hash
    if (txHash && txHash.startsWith('0x') && txHash.length === 66) {
      return {
        success: true,
        receipt: {
          transactionHash: txHash,
          blockNumber: '0x' + DEMO_BLOCK_NUMBER.toString(16),
          status: '0x1',
          from: '0x1234567890123456789012345678901234567890',
          to: '0x0987654321098765432109876543210987654321',
          gasUsed: '0x5208',
          logs: []
        }
      };
    }
    return { success: false, error: 'Transaction not found' };
  }

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
  if (DEMO_MODE) {
    await simulateDelay(100, 300);

    return {
      chainId: CHAIN_ID,
      blockNumber: DEMO_BLOCK_NUMBER,
      gasPrice: 0,
      rpcUrl: BESU_RPC,
      explorerUrl: 'https://hackathon-explorer.e.gov.ph',
      networkName: 'eBuhay Testnet',
      demo: true
    };
  }

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

/**
 * Reset demo state (useful for testing)
 */
function resetDemoState() {
  DEMO_BLOCK_NUMBER = 4821;
  DEMO_TX_COUNTER = 0;
}

module.exports = {
  computeConsentHash,
  anchorConsent,
  getTransactionReceipt,
  getChainInfo,
  getBlockNumber,
  DEMO_MODE,
  resetDemoState
};