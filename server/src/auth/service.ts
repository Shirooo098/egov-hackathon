import crypto from "crypto";
import { getPool } from "../db/pool.js";

export type Account = {
  id: string;
  role: string;
  hospitalId?: string | null;
  serviceScope?: string[];
  [key: string]: unknown;
};

const SESSION_COOKIE = process.env.SESSION_COOKIE || "ebuhay_session";
const configuredTtl = Number(process.env.SESSION_TTL_MS);
const SESSION_TTL_MS = Number.isFinite(configuredTtl)
  ? Math.min(Math.max(configuredTtl, 15 * 60 * 1000), 8 * 60 * 60 * 1000)
  : 8 * 60 * 60 * 1000;
const TOKEN_LENGTH = 43;
const digest = (value: string | Buffer) =>
  crypto.createHash("sha256").update(value).digest();
const newToken = () => crypto.randomBytes(32).toString("base64url");

function publicAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row.id),
    role: String(row.role),
    displayName: String(row.display_name ?? ""),
    serviceScope: Array.isArray(row.service_scope)
      ? row.service_scope.map(String)
      : [],
    hospitalId: row.hospital_id ? String(row.hospital_id) : null,
  };
}

function isInvitationToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.length === TOKEN_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

async function redeemInvitation(token: unknown) {
  if (!isInvitationToken(token)) return null;
  const pool = getPool();
  const client = await pool.connect();
  const sessionToken = newToken();
  try {
    await client.query("BEGIN");
    const invitation = await client.query(
      `UPDATE invitations SET consumed_at = now()
      WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now() AND purpose IN ('admission', 'login')
      RETURNING purpose, intended_account_id, intended_contact, role, service_scope, hospital_id`,
      [digest(token)],
    );
    if (!invitation.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }
    const row = invitation.rows[0] as Record<string, unknown>;
    let account;
    if (row.purpose === "admission") {
      const created = await client.query(
        `INSERT INTO accounts (login_identity, display_name, role, service_scope, hospital_id)
        VALUES (COALESCE($1, 'invited-' || encode($2, 'hex')), $1, $3, $4, $5) RETURNING *`,
        [
          row.intended_contact,
          digest(token),
          row.role,
          row.service_scope || [],
          row.hospital_id || null,
        ],
      );
      account = created.rows[0];
    } else {
      const target = await client.query(
        `SELECT * FROM accounts WHERE id = $1 AND status = 'active' FOR UPDATE`,
        [row.intended_account_id],
      );
      if (!target.rowCount || target.rows[0].role !== "citizen") {
        await client.query("ROLLBACK");
        return null;
      }
      account = target.rows[0];
    }
    const expires = new Date(Date.now() + SESSION_TTL_MS);
    await client.query(
      "INSERT INTO sessions (account_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [account.id, digest(sessionToken), expires],
    );
    await client.query("COMMIT");
    return { token: sessionToken, account: publicAccount(account) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error instanceof Error && "code" in error && error.code === "23505")
      return null;
    throw error;
  } finally {
    client.release();
  }
}

type SessionExecutor = Pick<ReturnType<typeof getPool>, "query" | "connect">;
type QueryExecutor = Pick<SessionExecutor, "query">;
type SessionDeps = { executor?: SessionExecutor; now?: Date };

async function currentSession(token: unknown, deps: SessionDeps = {}) {
  if (!isInvitationToken(token)) return null;
  const now = deps.now ?? new Date();
  const executor = deps.executor ?? getPool();
  const result = await executor.query(
    `UPDATE sessions s SET last_seen_at = $2
    FROM accounts a LEFT JOIN staff_credentials sc ON sc.account_id = a.id
    WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > $2
    AND s.last_seen_at > $2 - interval '30 minutes'
    AND a.id = s.account_id AND a.status = 'active' AND (a.role = 'citizen' OR sc.disabled_at IS NULL)
    RETURNING a.id, a.role, a.display_name, a.service_scope, a.hospital_id`,
    [digest(token), now],
  );
  return result.rowCount ? publicAccount(result.rows[0]) : null;
}

async function listSessions(
  accountId: string,
  currentToken?: unknown,
  deps: SessionDeps = {},
) {
  const executor = deps.executor ?? getPool();
  const currentHash = isInvitationToken(currentToken)
    ? digest(currentToken)
    : null;
  const result = await executor.query(
    `SELECT id, created_at, last_seen_at, expires_at, revoked_at,
    (token_hash = $2) AS current FROM sessions WHERE account_id=$1 ORDER BY created_at DESC`,
    [accountId, currentHash],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    current: Boolean(row.current),
  }));
}
async function listVerificationHistory(
  accountId: string,
  executor: QueryExecutor = getPool(),
) {
  const result = await executor.query(
    `SELECT verified_at, source, profile->>'displayName' AS display_name
    FROM egov_verification_history WHERE account_id=$1 ORDER BY verified_at DESC`,
    [accountId],
  );
  return result.rows.map((row) => ({
    verifiedAt: row.verified_at,
    source: row.source,
    displayName: row.display_name ?? null,
  }));
}

async function revokeSession(
  accountId: string,
  sessionId: string,
  deps: Pick<SessionDeps, "executor"> = {},
) {
  const client = deps.executor
    ? await deps.executor.connect()
    : await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE sessions SET revoked_at=now()
      WHERE id=$1 AND account_id=$2 AND revoked_at IS NULL RETURNING id, revoked_at AS "revokedAt"`,
      [sessionId, accountId],
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      "INSERT INTO audit_events(actor_account_id, action, target_reference, source, details) VALUES($1,'session.remote_revoke',$2,'api', $3)",
      [accountId, sessionId, JSON.stringify({ sessionId })],
    );
    await client.query("COMMIT");
    return {
      id: String(result.rows[0].id),
      revokedAt: result.rows[0].revokedAt,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function logout(token: unknown, deps: SessionDeps = {}): Promise<void> {
  if (isInvitationToken(token))
    await (deps.executor ?? getPool()).query(
      "UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
      [digest(token)],
    );
}

export {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  redeemInvitation,
  currentSession,
  listSessions,
  listVerificationHistory,
  revokeSession,
  logout,
  publicAccount,
};
