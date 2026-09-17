import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";
import type { ApiResponse, Session } from "./types";

export interface AuthContextValue {
  session: Session | null;
  status: string;
  restored: boolean;
  error: unknown;
  restoreSession: () => Promise<Session | null>;
  redeemInvitation: (token: string, audience?: string) => Promise<Session>;
  signInStaff: (
    username: string,
    password: string,
    mfaCode: string,
  ) => Promise<Session>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromResponse(response: ApiResponse): Session | null {
  return response?.success && response.account
    ? { account: response.account }
    : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Anonymous is the safe initial value for public routes; protected routes
  // also wait for `restored` before deciding whether to redirect.
  const [status, setStatus] = useState("anonymous");
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const restoreSession = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await api.auth.session();
      const nextSession = sessionFromResponse(response);
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "anonymous");
      setRestored(true);
      return nextSession;
    } catch (cause) {
      setSession(null);
      setStatus(
        cause instanceof Error &&
          "status" in cause &&
          (cause as Error & { status?: number }).status === 401
          ? "anonymous"
          : "unavailable",
      );
      setRestored(true);
      setError(cause);
      return null;
    }
  }, []);

  const redeemInvitation = useCallback(
    async (token: string, audience = "citizen") => {
      setStatus("loading");
      setError(null);
      try {
        const response = await api.auth.redeemInvitation(token);
        const nextSession = sessionFromResponse(response);
        if (!nextSession)
          throw new Error("The invitation response was incomplete.");
        const allowed =
          audience === "staff"
            ? [
                "coordinator",
                "doctor",
                "clinical_lead",
                "hospital_admin",
                "scheduler",
                "supervisor",
              ].includes(nextSession.account.role)
            : nextSession.account.role === "citizen";
        if (!allowed) {
          await api.auth.logout().catch(() => {});
          throw new Error(
            audience === "staff"
              ? "This invitation is not for an authorized hospital staff account."
              : "This invitation is not for a citizen account.",
          );
        }
        setSession(nextSession);
        setStatus("authenticated");
        setRestored(true);
        return nextSession;
      } catch (cause) {
        setSession(null);
        setStatus("anonymous");
        setRestored(true);
        setError(cause);
        throw cause;
      }
    },
    [],
  );

  const signInStaff = useCallback(
    async (username: string, password: string, mfaCode: string) => {
      setStatus("loading");
      setError(null);
      try {
        const response = await api.auth.staffSignIn(
          username,
          password,
          mfaCode,
        );
        const nextSession = sessionFromResponse(response);
        if (
          !nextSession ||
          ![
            "coordinator",
            "doctor",
            "clinical_lead",
            "hospital_admin",
            "scheduler",
            "supervisor",
          ].includes(nextSession.account.role)
        ) {
          throw new Error("Staff sign-in was not authorized.");
        }
        setSession(nextSession);
        setStatus("authenticated");
        setRestored(true);
        return nextSession;
      } catch (cause) {
        setSession(null);
        setStatus("anonymous");
        setRestored(true);
        setError(cause);
        throw cause;
      }
    },
    [],
  );

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (cause) {
      setError(cause);
    } finally {
      setSession(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({
      session,
      status,
      restored,
      error,
      restoreSession,
      redeemInvitation,
      signInStaff,
      signOut,
    }),
    [
      session,
      status,
      restored,
      error,
      restoreSession,
      redeemInvitation,
      signInStaff,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(optional = false): AuthContextValue | null {
  const value = useContext(AuthContext);
  if (!value && optional) return null;
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function sessionRole(
  session: Session | null | Record<string, unknown> | undefined,
): string | null {
  if (!session) return null;
  const value = session as Record<string, unknown>;
  const account = value.account as Record<string, unknown> | undefined;
  return typeof value.role === "string"
    ? value.role
    : typeof account?.role === "string"
      ? account.role
      : null;
}
