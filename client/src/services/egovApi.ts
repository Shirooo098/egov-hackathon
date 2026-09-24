/** Curated public eGovAI questions go through the eBuhay backend. */

const BASE = "/api/egov";
type Json = Record<string, unknown>;

async function postJSON(url: string, body: Json): Promise<Json> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) {
    throw new Error(String(data.message || `Request failed (${res.status})`));
  }
  return data;
}

export const egovApi = {
  async askAI(prompt: string, category = "PH") {
    return postJSON(`${BASE}/ai/chat`, { prompt, category });
  },
};
