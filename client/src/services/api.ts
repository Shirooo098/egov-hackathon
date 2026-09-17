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

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(^|;\s*)ebuhay_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : undefined;
}

async function request(
  path: string,
  options: RequestOptions = {},
): Promise<JsonObject> {
  const csrf = getCsrfToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (csrf) headers["x-csrf-token"] = csrf;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
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
  // Operations & Admin Controls
  operations: {
    reset: (confirmation = "RESET_SYNTHETIC_DATA") =>
      request("/v1/operations/reset", {
        method: "POST",
        body: JSON.stringify({ confirm: true, confirmation }),
      }),
  },
  // Blockchain
  anchorConsent: (body: JsonObject) =>
    request("/blockchain/anchor", {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
