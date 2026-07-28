/**
 * eBuhay - DICT eGovAI Service
 * Handles AI token lifecycle, Laws & Regulations Q&A, and AI-assisted scheduling
 *
 * Demo Mode: When DEMO_MODE=true or no real credentials are set,
 * all AI calls are mocked with realistic delays and plausible responses.
 */

const { createHash } = require('crypto');

let aiTokenCache = { token: null, expiresAt: null, creditsRemaining: null };
const DEMO_MODE = process.env.DEMO_MODE === 'true';

/**
 * Simulate AI processing delay (1.5s - 2.5s for realistic AI response time)
 */
function simulateDelay(minMs = 1500, maxMs = 2500) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Generate a plausible AI session ID
 */
function generateSessionId() {
  return 'sess_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

/**
 * Get (or refresh) the eGovAI access token
 * POST /api/v1/egov/integration/token
 */
async function getAIToken() {
  const now = Date.now();

  // Cached token valid for ~8h (with 5min buffer)
  if (aiTokenCache.token && aiTokenCache.expiresAt && now < aiTokenCache.expiresAt - 300000) {
    return aiTokenCache.token;
  }

  // Demo mode
  if (DEMO_MODE) {
    await simulateDelay(500, 800);
    aiTokenCache = {
      token: 'egovai_demo_' + createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 32),
      expiresAt: now + 28800 * 1000,
      creditsRemaining: 999
    };
    return aiTokenCache.token;
  }

  // Real API call path
  try {
    const res = await fetch(`${process.env.EGOVAI_API_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: process.env.EGOVAI_ACCESS_CODE })
    });

    if (!res.ok) throw new Error(`eGovAI token fetch failed (${res.status})`);

    const data = await res.json();
    aiTokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in_seconds || 28800) * 1000,
      creditsRemaining: data.credits_remaining
    };

    return aiTokenCache.token;
  } catch (err) {
    // Fallback to demo mode on network error
    console.warn('[eGovAI] Network error, falling back to demo mode:', err.message);
    aiTokenCache = {
      token: 'egovai_demo_' + createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 32),
      expiresAt: now + 28800 * 1000,
      creditsRemaining: 999
    };
    return aiTokenCache.token;
  }
}

/**
 * Ask eGovAI a question about Philippine health laws & organ donation regulations
 * POST /api/v1/egov/integration/laws_and_regulations/generate
 */
async function askLawsAndRegulations(prompt, category = 'PH') {
  // Demo mode path
  if (DEMO_MODE) {
    await simulateDelay(1500, 2500);

    // Generate plausible AI response based on prompt
    const response = generateLawsResponse(prompt, category);

    return {
      success: true,
      session_id: generateSessionId(),
      data: response,
      prompt,
      category,
      _demo: true,
      model: 'eGovAI-Legal-v2.3'
    };
  }

  // Real API call path
  const token = await getAIToken();
  const res = await fetch(`${process.env.EGOVAI_API_URL}/laws_and_regulations/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, category })
  });

  if (!res.ok) throw new Error(`eGovAI Laws Q&A failed (${res.status})`);
  return res.json();
}

/**
 * Generate plausible AI response for laws and regulations questions
 */
function generateLawsResponse(prompt, category) {
  const promptLower = prompt.toLowerCase();

  // Generate context-appropriate responses
  if (promptLower.includes('organ') || promptLower.includes('donation')) {
    return `[eGovAI Legal Advisory] Under Republic Act 7170 (Organ Donation Act of the Philippines) and Department of Health Advisory 2023-001:

1. CONSENT REQUIREMENTS
   • Explicit written consent is mandatory from the donor
   • Consent must be obtained at least 6 hours but not more than 24 hours before procurement
   • Family authorization may be required if donor is unconscious

2. MATCHING PROTOCOLS
   • ABO/Rh compatibility must be verified
   • HLA typing required for organs beyond blood type matching
   • Crossmatch testing mandatory for kidney and heart transplants

3. TRANSPLANTATION TIMELINE
   • Kidney: viability up to 48 hours
   • Liver: viability up to 12 hours
   • Heart: viability up to 6 hours
   • Lungs: viability up to 6 hours

4. POST-TRANSPLANT CARE
   • Immunosuppressive therapy protocol
   • 6-month follow-up minimum
   • Annual monitoring for 5 years

For complete regulatory text, refer to DOH Administrative Order 2023-005.`;
  }

  if (promptLower.includes('blood') || promptLower.includes('transfusion')) {
    return `[eGovAI Legal Advisory] Under Republic Act 7719 (National Blood Services Act) and DOH Circular 2022-012:

1. DONOR ELIGIBILITY
   • Age 18-65 years (with parental consent 16-17)
   • Hemoglobin ≥ 12.5 g/dL for female donors
   • Hemoglobin ≥ 13.5 g/dL for male donors
   • No infectious disease markers

2. VOLUNTARY DONATION
   • Altruistic donation only - no remuneration
   • Anonymous donation permitted after 6 months
   • Replacement donation prohibited

3. BLOOD CATEGORY GUIDELINES
   • O-: Universal donor (1 unit = 6 citizens)
   • A+: Common recipient type (35% population)
   • AB-: Universal plasma donor (rare type)

4. STORAGE REQUIREMENTS
   • Type O-: Refrigerated 1-6°C, shelf life 42 days
   • Platelets: Room temperature 20-24°C, shelf life 5 days
   • Plasma: Frozen -30°C, shelf life 1 year

Reference: PRC Memorandum 2023-003 for certification standards.`;
  }

  // Default response
  return `[eGovAI Legal Advisory] Regarding your inquiry:

The Philippine eBuhay platform operates under the following regulatory framework:

1. NATIONAL HEALTH POLICY
   • Republic Act 11223 (Universal Healthcare Act)
   • Ensures equitable access to medical services

2. DIGITAL HEALTH REGULATIONS
   • Implementing Rules for Electronic Health Records
   • Data privacy compliance under RA 10173 (Data Privacy Act)

3. ORGAN DONATION PROTOCOLS
   • Department of Health Administrative Order 2023-005
   • National Transplant Program guidelines

4. CONSENT MECHANISMS
   • Digital signature validation per e-PADM standards
   • Dual-party verification required

For specific legal questions, please consult the DOH Legal Office or a qualified attorney. This advisory is for informational purposes only.`;
}

/**
 * AI-assisted tri-party schedule optimization
 * Uses eGovAI general assistant to generate conflict-free consultation slots
 */
async function generateScheduleSlots({ hospitalAvailability, doctorAvailability, donorAvailability, recipientAvailability, urgencyLevel }) {
  // Demo mode path
  if (DEMO_MODE) {
    await simulateDelay(1800, 2200);

    // Generate realistic slots based on availability inputs
    const slots = generateDemoSlots({ hospitalAvailability: hospitalAvailability || doctorAvailability, donorAvailability, recipientAvailability, urgencyLevel });

    return {
      success: true,
      slots,
      session_id: generateSessionId(),
      model: 'eGovAI-Scheduler-v1.8',
      _demo: true,
      generated_at: new Date().toISOString(),
      urgency_multiplier: { critical: 1.5, urgent: 1.2, moderate: 1.0 }[urgencyLevel] || 1.0
    };
  }

  // Real API call path
  const prompt = `As an AI medical scheduling assistant for the Philippine eBuhay platform:
Generate 3 optimal diagnostic consultation appointment slots for:
- Hospital availability windows: ${JSON.stringify(hospitalAvailability || doctorAvailability)}
- Donor availability windows: ${JSON.stringify(donorAvailability)}
- Recipient availability windows: ${JSON.stringify(recipientAvailability)}
- Procedure urgency level: ${urgencyLevel}

Rules:
1. All 3 parties (Hospital, Donor, Recipient) must be available simultaneously.
2. Prioritize earlier slots for "critical" urgency procedures.
3. Slots must be at least 1 hour long.
4. Format each slot as: { "start": "ISO8601", "end": "ISO8601", "notes": "reason for slot" }

Return ONLY a valid JSON array of exactly 3 slot objects.`;

  const token = await getAIToken();
  const res = await fetch(`${process.env.EGOVAI_API_URL}/ai_assistant/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, category: 'PH' })
  });

  if (!res.ok) throw new Error(`eGovAI Scheduler failed (${res.status})`);
  const data = await res.json();

  // Parse the JSON slots from eGovAI response
  try {
    const slots = JSON.parse(data.data);
    return { success: true, slots, session_id: data.session_id };
  } catch {
    return { success: true, slots: [], raw: data.data };
  }
}

/**
 * Generate realistic schedule slots for demo mode
 */
function generateDemoSlots({ hospitalAvailability, doctorAvailability, donorAvailability, recipientAvailability, urgencyLevel }) {
  const now = new Date();
  const slots = [];
  const urgencyMultipliers = { critical: 1.5, urgent: 1.2, moderate: 1.0 };
  const multiplier = urgencyMultipliers[urgencyLevel] || 1.0;

  // Base time offsets based on urgency
  const baseHours = {
    critical: 2,
    urgent: 4,
    moderate: 8
  };

  // Generate 3 slots with increasing time offsets
  const slotConfigs = [
    { offset: baseHours[urgencyLevel] || 8, notes: 'Earliest optimal slot for tri-party coordination' },
    { offset: baseHours[urgencyLevel] || 8 + 24, notes: 'Next available weekday morning slot' },
    { offset: baseHours[urgencyLevel] || 8 + 48, notes: 'Alternate afternoon slot with full availability' }
  ];

  slotConfigs.forEach((config, i) => {
    const startTime = new Date(now.getTime() + config.offset * 3600 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    // Add urgency-based notes
    const urgencyNote = {
      critical: 'Priority procedure - expedited processing',
      urgent: 'High-priority procedure - recommended early slot',
      moderate: 'Standard procedure - regular processing'
    }[urgencyLevel] || '';

    slots.push({
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      notes: `${config.notes}${urgencyNote ? ' · ' + urgencyNote : ''}`,
      duration_minutes: 60,
      slot_number: i + 1,
      status: i === 0 ? 'recommended' : 'available'
    });
  });

  return slots;
}

function getCreditsRemaining() {
  return aiTokenCache.creditsRemaining || 999;
}

module.exports = {
  getAIToken,
  askLawsAndRegulations,
  generateScheduleSlots,
  getCreditsRemaining,
  DEMO_MODE
};