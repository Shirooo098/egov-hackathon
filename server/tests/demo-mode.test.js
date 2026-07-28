/**
 * Demo Mode Verification Tests
 * Run with: node tests/demo-mode.test.js
 *
 * This script verifies that all external API integrations work in demo mode
 * without making any real network calls.
 */

require('dotenv').config();

// Force demo mode for testing
process.env.DEMO_MODE = 'true';

const assert = require('assert');

async function runTests() {
  console.log('='.repeat(60));
  console.log('eBuhay Demo Mode Verification Tests');
  console.log('='.repeat(60));
  console.log();

  let passed = 0;
  let failed = 0;

  // Test 1: eVerify Service
  console.log('Test 1: eVerify Service (Demo Mode)');
  try {
    const eVerify = require('../src/services/eVerifyService');

    console.log('  - Testing verifyIdentity()...');
    const verifyResult = await eVerify.verifyIdentity({
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      birth_date: '1990-05-15',
      middle_name: 'P.',
      face_liveness_session_id: 'demo-session-123'
    });

    assert.strictEqual(verifyResult.success, true, 'verifyIdentity should return success');
    assert.ok(verifyResult.profile, 'verifyIdentity should return profile');
    assert.ok(verifyResult.profile.first_name === 'Juan', 'Profile should contain correct name');
    assert.ok(verifyResult.profile.blood_type, 'Profile should contain blood_type');
    assert.ok(verifyResult._demo === true, 'Response should be marked as demo');

    console.log('  ✓ verifyIdentity() passed');

    console.log('  - Testing decodeQR()...');
    const qrResult = await eVerify.decodeQR('demo-qr-code-123');
    assert.strictEqual(qrResult.success, true, 'decodeQR should return success');
    assert.ok(qrResult.pcn, 'decodeQR should return PCN');
    assert.ok(qrResult._demo === true, 'Response should be marked as demo');

    console.log('  ✓ decodeQR() passed');

    console.log('  ✓ eVerify Service: ALL TESTS PASSED');
    passed++;
  } catch (err) {
    console.log('  ✗ eVerify Service FAILED:', err.message);
    failed++;
  }

  console.log();

  // Test 2: eMessage Service
  console.log('Test 2: eMessage Service (Demo Mode)');
  try {
    const eMessage = require('../src/services/eMessageService');

    console.log('  - Testing sendSMS()...');
    const smsResult = await eMessage.sendSMS('+639171234567', 'Test SMS from eBuhay demo');

    assert.strictEqual(smsResult.success, true, 'sendSMS should return success');
    assert.ok(smsResult.message_id, 'sendSMS should return message_id');
    assert.ok(smsResult.status === 'delivered', 'SMS should be marked as delivered');
    assert.ok(smsResult._demo === true, 'Response should be marked as demo');

    console.log('  ✓ sendSMS() passed');

    console.log('  - Testing notifyMatchFound()...');
    const matchNotify = await eMessage.notifyMatchFound('+639171234567', 'Juan Dela Cruz', 'blood');
    assert.strictEqual(matchNotify.success, true, 'notifyMatchFound should return success');

    console.log('  ✓ notifyMatchFound() passed');

    console.log('  - Testing notifyAppointmentConfirmed()...');
    const apptNotify = await eMessage.notifyAppointmentConfirmed('+639171234567', 'July 28, 2026 10:00 AM', 'Dr. Santos');
    assert.strictEqual(apptNotify.success, true, 'notifyAppointmentConfirmed should return success');

    console.log('  ✓ notifyAppointmentConfirmed() passed');

    console.log('  ✓ eMessage Service: ALL TESTS PASSED');
    passed++;
  } catch (err) {
    console.log('  ✗ eMessage Service FAILED:', err.message);
    failed++;
  }

  console.log();

  // Test 3: eGovAI Service
  console.log('Test 3: eGovAI Service (Demo Mode)');
  try {
    const eGovAI = require('../src/services/eGovAIService');

    console.log('  - Testing askLawsAndRegulations()...');
    const lawsResult = await eGovAI.askLawsAndRegulations('What are the laws on organ donation in the Philippines?');

    assert.strictEqual(lawsResult.success, true, 'askLawsAndRegulations should return success');
    assert.ok(lawsResult.data, 'askLawsAndRegulations should return data');
    assert.ok(lawsResult.data.includes('RA 7170') || lawsResult.data.includes('organ'), 'Response should be relevant');
    assert.ok(lawsResult._demo === true, 'Response should be marked as demo');

    console.log('  ✓ askLawsAndRegulations() passed');

    console.log('  - Testing generateScheduleSlots()...');
    const scheduleResult = await eGovAI.generateScheduleSlots({
      doctorAvailability: [{ start: '2026-07-28T08:00:00Z', end: '2026-07-28T17:00:00Z' }],
      donorAvailability: [{ start: '2026-07-28T09:00:00Z', end: '2026-07-28T15:00:00Z' }],
      recipientAvailability: [{ start: '2026-07-28T10:00:00Z', end: '2026-07-28T16:00:00Z' }],
      urgencyLevel: 'moderate'
    });

    assert.strictEqual(scheduleResult.success, true, 'generateScheduleSlots should return success');
    assert.ok(Array.isArray(scheduleResult.slots), 'slots should be an array');
    assert.strictEqual(scheduleResult.slots.length, 3, 'Should return exactly 3 slots');
    assert.ok(scheduleResult.slots[0].start, 'Each slot should have a start time');
    assert.ok(scheduleResult.slots[0].end, 'Each slot should have an end time');
    assert.ok(scheduleResult._demo === true, 'Response should be marked as demo');

    console.log('  ✓ generateScheduleSlots() passed');

    console.log('  ✓ eGovAI Service: ALL TESTS PASSED');
    passed++;
  } catch (err) {
    console.log('  ✗ eGovAI Service FAILED:', err.message);
    failed++;
  }

  console.log();

  // Test 4: Besu Service
  console.log('Test 4: Besu Service (Demo Mode)');
  try {
    const BesuService = require('../src/services/BesuService');

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
  } catch (err) {
    console.log('  ✗ Besu Service FAILED:', err.message);
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
  console.error('Test runner failed:', err);
  process.exit(1);
});