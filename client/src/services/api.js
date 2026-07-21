const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'API Error');
  return data;
}

export const api = {
  // Health
  health: () => request('/health'),

  // eVerify
  verify: (body) => request('/auth/verify', { method: 'POST', body: JSON.stringify(body) }),
  verifyQR: (qr_value) => request('/auth/verify/qr', { method: 'POST', body: JSON.stringify({ qr_value }) }),

  // Matchmaking
  findMatches: (params) => request('/matches/find?' + new URLSearchParams(params)),
  getCompatibility: (blood_type) => request(`/matches/compatibility/${blood_type}`),
  getMatrix: () => request('/matches/matrix'),

  // AI Scheduler
  optimizeSchedule: (body) => request('/schedule/ai-optimize', { method: 'POST', body: JSON.stringify(body) }),

  // Blockchain
  anchorConsent: (body) => request('/blockchain/anchor', { method: 'POST', body: JSON.stringify(body) }),
  getReceipt: (txHash) => request(`/blockchain/receipt/${txHash}`),
  getChainInfo: () => request('/blockchain/chain-info'),

  // eGovAI Laws
  askLaws: (prompt, category = 'PH') => request('/egovai/laws', { method: 'POST', body: JSON.stringify({ prompt, category }) })
};
