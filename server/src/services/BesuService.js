/**
 * eBuhay - DICT eGov Blockchain Anchoring Service
 *
 * Submits SHA-256 consent hashes as on-chain calldata to an EVM-compatible
 * chain. Default: Ethereum Sepolia testnet (most reliable public testnet).
 * Alternate: DICT Besu hackathon node (BESU_MODE=besu).
 *
 * Anchoring strategy: 0-value transaction with the 32-byte consent hash as
 * calldata. No smart contract deployment required.
 *
 * TESTNET ONLY. The BESU_PRIVATE_KEY must be a throwaway testnet key with
 * no real-world ETH balance. Never reuse this key for mainnet or any
 * production system.
 */

const { createHash } = require('crypto');
const { JsonRpcProvider, Wallet, isHexString } = require('ethers');

const BESU_MODE = (process.env.BESU_MODE || 'sepolia').toLowerCase();
const BESU_RPC_URL = process.env.BESU_RPC_URL || (
  BESU_MODE === 'besu'
    ? 'https://hackathon-blockchain.e.gov.ph'
    : 'https://ethereum-sepolia-rpc.publicnode.com'
);
const CHAIN_ID = parseInt(process.env.BESU_CHAIN_ID || (BESU_MODE === 'besu' ? '13371' : '11155111'), 10);
const BESU_PRIVATE_KEY = process.env.BESU_PRIVATE_KEY || '';
const ANCHOR_WALLET_ADDRESS = process.env.ANCHOR_WALLET_ADDRESS || '';
const EXPLORER_URL = process.env.EXPLORER_URL || (
  BESU_MODE === 'besu'
    ? 'https://hackathon-explorer.e.gov.ph'
    : 'https://sepolia.etherscan.io'
);

// Demo mode is ONLY enabled when explicitly requested AND no key is configured.
// This preserves the existing export shape and lets the team demo offline if
// absolutely necessary, but it is no longer the default behavior.
const DEMO_MODE = process.env.DEMO_MODE === 'true' && !BESU_PRIVATE_KEY;

// Demo-mode state (only used when DEMO_MODE is forced on)
let DEMO_BLOCK_NUMBER = 4821;
let DEMO_TX_COUNTER = 0;

function simulateDelay(minMs = 300, maxMs = 800) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function generateTxHash() {
  const hash = createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex');
  return '0x' + hash;
}

function computeConsentHash(consentData) {
  const sortedKeys = Object.keys(consentData).sort();
  const canonical = JSON.stringify(consentData, sortedKeys);
  return '0x' + createHash('sha256').update(canonical).digest('hex');
}

// Lazy provider + wallet singletons
let _provider = null;
let _wallet = null;

function getProvider() {
  if (_provider) return _provider;
  _provider = new JsonRpcProvider(BESU_RPC_URL, CHAIN_ID);
  return _provider;
}

function getWallet() {
  if (_wallet) return _wallet;
  if (!BESU_PRIVATE_KEY) {
    throw new Error('BESU_PRIVATE_KEY is required for live anchoring. Generate a testnet key with `node -e "const {Wallet}=require(\'ethers\'); const w=Wallet.createRandom(); console.log(w.privateKey)"` and fund it via https://sepoliafaucet.com');
  }
  if (!isHexString(BESU_PRIVATE_KEY, 32) && !BESU_PRIVATE_KEY.startsWith('0x')) {
    throw new Error('BESU_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string.');
  }
  _wallet = new Wallet(BESU_PRIVATE_KEY, getProvider());
  return _wallet;
}

function requireAnchorAddress() {
  if (ANCHOR_WALLET_ADDRESS) return ANCHOR_WALLET_ADDRESS;
  // Default to the wallet's own address (self-send is allowed and cheaper)
  return getWallet().address;
}

/**
 * Anchor a consent hash on the configured EVM chain.
 * In DEMO_MODE (forced + no key), simulates the transaction for offline demos.
 * Otherwise submits a real 0-value transaction with the consent hash as calldata.
 *
 * @param {object} consentData - { matchId, donorId, recipientId, donorSignature, recipientSignature, timestamp, platform }
 * @returns {{ success, demo, consentHash, txHash, blockNumber, chainId, explorerUrl, gasUsed, status, timestamp }}
 */
async function anchorConsent(consentData) {
  const consentHash = computeConsentHash(consentData);

  if (DEMO_MODE) {
    // Forced demo path — only reachable when DEMO_MODE=true AND no key set
    await simulateDelay(400, 700);
    const fakeTxHash = generateTxHash();
    DEMO_BLOCK_NUMBER += 1;
    const blockNumber = DEMO_BLOCK_NUMBER;
    DEMO_TX_COUNTER++;

    return {
      success: true,
      demo: true,
      consentHash,
      txHash: fakeTxHash,
      blockNumber,
      chainId: CHAIN_ID,
      explorerUrl: `${EXPLORER_URL}/tx/${fakeTxHash}`,
      timestamp: new Date().toISOString(),
      gasUsed: '0x5208',
      status: 'mined',
      confirmations: 12,
      _demo: true
    };
  }

  // Live path
  const wallet = getWallet();
  const provider = getProvider();
  const to = requireAnchorAddress();

  const tx = await wallet.sendTransaction({
    to,
    value: 0n,
    data: consentHash,
    // 32-byte calldata transaction: 21000 (base) + 16 * 32 (calldata bytes) = 21512
    // Bump to 30000 for safety across chain implementations
    gasLimit: 30000n,
  });

  // Wait for 1 confirmation so blockNumber is meaningful for the UI
  const receipt = await tx.wait(1);

  if (!receipt) {
    throw new Error('Transaction receipt was null after wait()');
  }

  return {
    success: true,
    demo: false,
    consentHash,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    chainId: CHAIN_ID,
    explorerUrl: `${EXPLORER_URL}/tx/${receipt.hash}`,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status === 1 ? 'mined' : 'failed',
    from: receipt.from,
    to: receipt.to,
    confirmations: 1,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get a transaction receipt from the chain
 */
async function getTransactionReceipt(txHash) {
  if (DEMO_MODE) {
    await simulateDelay(200, 500);
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

  if (!txHash || !txHash.startsWith('0x')) {
    return { success: false, error: 'Invalid txHash format' };
  }

  try {
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { success: false, error: 'Transaction not found' };
    }
    return {
      success: true,
      receipt: {
        transactionHash: receipt.hash,
        blockNumber: '0x' + receipt.blockNumber.toString(16),
        status: receipt.status === 1 ? '0x1' : '0x0',
        from: receipt.from,
        to: receipt.to,
        gasUsed: '0x' + receipt.gasUsed.toString(16),
        logs: []
      }
    };
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
      rpcUrl: BESU_RPC_URL,
      explorerUrl: EXPLORER_URL,
      networkName: BESU_MODE === 'besu' ? 'eBuhay Testnet (mocked)' : 'Ethereum Sepolia (mocked)',
      mode: BESU_MODE,
      demo: true
    };
  }

  try {
    const provider = getProvider();
    const [network, blockNumber, feeData] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);
    return {
      chainId: Number(network.chainId),
      blockNumber,
      gasPrice: feeData.gasPrice ? Number(feeData.gasPrice) : 0,
      rpcUrl: BESU_RPC_URL,
      explorerUrl: EXPLORER_URL,
      networkName: BESU_MODE === 'besu' ? 'DICT eBuhay Besu Testnet' : 'Ethereum Sepolia',
      mode: BESU_MODE,
      demo: false
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get current block number
 */
async function getBlockNumber() {
  if (DEMO_MODE) {
    DEMO_BLOCK_NUMBER += 1;
    return DEMO_BLOCK_NUMBER;
  }
  return await getProvider().getBlockNumber();
}

/**
 * Reset demo state (only relevant in DEMO_MODE)
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
  resetDemoState,
  DEMO_MODE
};
