const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

interface RequestOptions extends RequestInit {
  headers?: HeadersInit;
}
interface ApiError extends Error {
  status?: number;
  code?: string;
}
type JsonObject = Record<string, unknown>;

async function request(
  path: string,
  options: RequestOptions = {},
): Promise<JsonObject> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  let data: JsonObject = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data?.success === false) {
    const error = new Error(
      String(
        data.message || data.error || `API request failed (${res.status})`,
      ),
    ) as ApiError;
    error.status = res.status;
    error.code = typeof data.error === "string" ? data.error : undefined;
    throw error;
  }
  return data;
}

export const api = {
  request,
  auth: {
    session: () => request("/auth/session"),
    redeemInvitation: (token: string) =>
      request("/auth/invitations/redeem", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    logout: () => request("/auth/logout", { method: "POST" }),
    staffSignIn: (username: string, password: string, mfaCode: string) =>
      request("/auth/staff/sign-in", {
        method: "POST",
        body: JSON.stringify({ username, password, mfaCode }),
      }),
  },
  // Health
  health: () => request("/health"),

  // eVerify
  verify: (body: JsonObject) =>
    request("/auth/verify", { method: "POST", body: JSON.stringify(body) }),
  verifyQR: (qr_value: string) =>
    request("/auth/verify/qr", {
      method: "POST",
      body: JSON.stringify({ qr_value }),
    }),

  // Matchmaking
  findMatches: (params: Record<string, string>) =>
    request("/matches/find?" + new URLSearchParams(params)),
  getCompatibility: (blood_type: string) =>
    request(`/matches/compatibility/${blood_type}`),
  getMatrix: () => request("/matches/matrix"),

  // AI Scheduler
  optimizeSchedule: (body: JsonObject) =>
    request("/schedule/ai-optimize", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Blockchain
  anchorConsent: (body: JsonObject) =>
    request("/blockchain/anchor", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getReceipt: (txHash: string) => request(`/blockchain/receipt/${txHash}`),
  getChainInfo: () => request("/blockchain/chain-info"),

  // eGovAI Laws
  askLaws: (prompt: string, category = "PH") =>
    request("/egovai/laws", {
      method: "POST",
      body: JSON.stringify({ prompt, category }),
    }),

  // eMessage SMS
  // number must be E.164 format, e.g. "+639090000000"
  sendSms: (number: string, message: string) =>
    request("/emessage/sms/push", {
      method: "POST",
      body: JSON.stringify({ number, message }),
    }),
};
