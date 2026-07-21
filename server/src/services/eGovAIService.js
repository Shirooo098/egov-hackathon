/**
 * eHealth - DICT eGovAI Service
 * Handles AI token lifecycle, Laws & Regulations Q&A, and AI-assisted scheduling
 */

let aiTokenCache = { token: null, expiresAt: null, creditsRemaining: null };
const DEMO_MODE = process.env.EGOVAI_ACCESS_CODE === 'dict_egovai_demo_access_code';

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

  if (DEMO_MODE) {
    aiTokenCache = {
      token: 'demo_egovai_token_' + Date.now(),
      expiresAt: now + 28800 * 1000,
      creditsRemaining: 999
    };
    return aiTokenCache.token;
  }

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
}

/**
 * Ask eGovAI a question about Philippine health laws & organ donation regulations
 * POST /api/v1/egov/integration/laws_and_regulations/generate
 */
async function askLawsAndRegulations(prompt, category = 'PH') {
  if (DEMO_MODE) {
    return {
      success: true,
      demo: true,
      session_id: 'demo-session-' + Date.now(),
      data: `[Demo Response] Under Republic Act 7170 (Organ Donation Act of the Philippines), organ donation requires the explicit written consent of the donor. The Department of Health oversees all organ donation operations. For blood donations, RA 7719 (National Blood Services Act) governs voluntary blood donation. For more information, visit the Philippine Health Service portal at ehealth.e.gov.ph.`,
      prompt
    };
  }

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
 * AI-assisted tri-party schedule optimization
 * Uses eGovAI general assistant to generate conflict-free consultation slots
 */
async function generateScheduleSlots({ doctorAvailability, donorAvailability, recipientAvailability, urgencyLevel }) {
  const prompt = `As an AI medical scheduling assistant for the Philippine eHealth platform:
Generate 3 optimal diagnostic consultation appointment slots for:
- Doctor availability windows: ${JSON.stringify(doctorAvailability)}
- Donor availability windows: ${JSON.stringify(donorAvailability)}
- Recipient availability windows: ${JSON.stringify(recipientAvailability)}
- Case urgency level: ${urgencyLevel}

Rules:
1. All 3 parties (Doctor, Donor, Recipient) must be available simultaneously.
2. Prioritize earlier slots for "critical" urgency cases.
3. Slots must be at least 1 hour long.
4. Format each slot as: { "start": "ISO8601", "end": "ISO8601", "notes": "reason for slot" }

Return ONLY a valid JSON array of exactly 3 slot objects.`;

  if (DEMO_MODE) {
    const now = new Date();
    return {
      success: true,
      demo: true,
      slots: [
        {
          start: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
          end: new Date(now.getTime() + 3 * 3600 * 1000).toISOString(),
          notes: 'Earliest available slot â€” recommended for urgent cases'
        },
        {
          start: new Date(now.getTime() + 26 * 3600 * 1000).toISOString(),
          end: new Date(now.getTime() + 27 * 3600 * 1000).toISOString(),
          notes: 'Next available weekday morning slot'
        },
        {
          start: new Date(now.getTime() + 50 * 3600 * 1000).toISOString(),
          end: new Date(now.getTime() + 51 * 3600 * 1000).toISOString(),
          notes: 'Alternate afternoon slot'
        }
      ]
    };
  }

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

function getCreditsRemaining() {
  return aiTokenCache.creditsRemaining;
}

module.exports = { getAIToken, askLawsAndRegulations, generateScheduleSlots, getCreditsRemaining };
