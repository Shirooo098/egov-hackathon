/**
 * Demo Mode Verification Tests
 * Run with: tsx tests/demo-mode.test.ts
 *
 * This script verifies that all external API integrations work in demo mode
 * without making any real network calls.
 */

import 'dotenv/config';

// Force demo mode for testing
process.env.DEMO_MODE = 'true';

import assert from 'assert';

async function runTests() {
  console.log('='.repeat(60));
  console.log('eBuhay Demo Mode Verification Tests');
  console.log('='.repeat(60));
  console.log();

  let passed = 0;
  let failed = 0;



  console.log();

  // Test 2: eMessage Service (Truthful Provider Handling)
  console.log('Test 2: eMessage Service (Truthful Provider Handling)');
  try {
    const eMessage = await import('../src/services/eMessageService.js');

    console.log('  - Testing sendSMS()...');
    const smsResult = await eMessage.sendSMS('+639171234567', 'Test SMS from eBuhay demo');

    assert.strictEqual(smsResult.success, false, 'sendSMS without provider should be false');
    assert.strictEqual(smsResult.status, 'unavailable', 'SMS should be marked as unavailable');
    assert.strictEqual(smsResult.error, 'provider_unavailable', 'Error should be provider_unavailable');

    console.log('  ✓ sendSMS() passed');

    console.log('  ✓ eMessage Service: ALL TESTS PASSED');
    passed++;
  } catch (err: unknown) {
    console.log('  ✗ eMessage Service FAILED:', err instanceof Error ? err.message : err);
    failed++;
  }

  console.log();

  // Test 3: eGovAI Service (Deferred Mode)
  console.log('Test 3: eGovAI Service (Deferred Mode)');
  try {
    const eGovAI = await import('../src/services/eGovAIService.js');

    console.log('  - Testing askLawsAndRegulations()...');
    await assert.rejects(
      () => eGovAI.askLawsAndRegulations('What are the laws on organ donation in the Philippines?'),
      (err: any) => err.status === 503 && err.code === 'capability_deferred',
    );
    console.log('  ✓ askLawsAndRegulations() passed');

    console.log('  - Testing generateScheduleSlots()...');
    await assert.rejects(
      () =>
        eGovAI.generateScheduleSlots({
          hospitalAvailability: [{ start: '2026-07-28T08:00:00Z', end: '2026-07-28T17:00:00Z' }],
          donorAvailability: [{ start: '2026-07-28T09:00:00Z', end: '2026-07-28T15:00:00Z' }],
          recipientAvailability: [{ start: '2026-07-28T10:00:00Z', end: '2026-07-28T16:00:00Z' }],
          doctorAvailability: [],
          urgencyLevel: 'moderate',
        }),
      (err: any) => err.status === 503 && err.code === 'capability_deferred',
    );
    console.log('  ✓ generateScheduleSlots() passed');

    console.log('  ✓ eGovAI Service: ALL TESTS PASSED');
    passed++;
  } catch (err: unknown) {
    console.log('  ✗ eGovAI Service FAILED:', err instanceof Error ? err.message : err);
    failed++;
  }

  console.log();

  // Test 4: Besu Service
  console.log('Test 4: Besu Service (Demo Mode)');
  try {
    const BesuService = await import('../src/services/BesuService.js');

    console.log('  - Testing anchorConsent()...');
    const anchorResult = await BesuService.anchorConsent({
      matchId: 'demo-match-001',
      donorId: 'donor-001',
      recipientId: 'recipient-001',
      donorSignature: 'sig_d_123456',
      recipientSignature: 'sig_r_789012',
      timestamp: new Date().toISOString()
    });

    assert.strictEqual(anchorResult.success, true, 'anchorConsent should return success');
    assert.ok(anchorResult.txHash, 'anchorConsent should return txHash');
    assert.ok(anchorResult.txHash.startsWith('0x'), 'txHash should be a valid hex string');
    assert.ok(anchorResult.blockNumber, 'anchorConsent should return blockNumber');
    assert.strictEqual(anchorResult.chainId, 13371, 'Chain ID should be 13371');
    assert.ok(anchorResult.explorerUrl, 'anchorConsent should return explorerUrl');
    assert.ok(anchorResult._demo === true, 'Response should be marked as demo');

    console.log('  ✓ anchorConsent() passed');

    console.log('  - Testing getChainInfo()...');
    const chainInfo = await BesuService.getChainInfo();
    assert.strictEqual(chainInfo.chainId, 13371, 'Chain ID should be 13371');
    assert.strictEqual(chainInfo.gasPrice, 0, 'Gas price should be 0');
    assert.ok(chainInfo.demo === true, 'Response should be marked as demo');

    console.log('  ✓ getChainInfo() passed');

    console.log('  - Testing getTransactionReceipt()...');
    const receipt = await BesuService.getTransactionReceipt(anchorResult.txHash);
    assert.strictEqual(receipt.success, true, 'getTransactionReceipt should return success');

    console.log('  ✓ getTransactionReceipt() passed');

    console.log('  ✓ Besu Service: ALL TESTS PASSED');
    passed++;
  } catch (err: unknown) {
    console.log('  ✗ Besu Service FAILED:', err instanceof Error ? err.message : err);
    failed++;
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
