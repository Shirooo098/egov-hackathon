/** Curated public eGovAI questions go through the eBuhay backend. */

const BASE = "/api/egov";

export type EgovAiResponse = {
  success: boolean;
  data: string;
  informational?: boolean;
};

async function postJSON<T = Record<string, unknown>>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data.message || `Request failed (${res.status})`));
  }
  return data as T;
}

export const egovApi = {
  async askAI(prompt: string, category = "PH"): Promise<EgovAiResponse> {
    return postJSON<EgovAiResponse>(`${BASE}/ai/chat`, { prompt, category });
  },
};
