import crypto from "node:crypto";
import { getPool } from "../db/pool.js";
import type { Pool } from "pg";
import { SESSION_TTL_MS, publicAccount } from "./service.js";
import type { RuntimeMode } from "../runtime/config.js";

export type SyntheticEgovProfile = {
  uniqid: string;
  displayName?: string;
  expiresAt?: Date;
};
const secret = () => {
  const value = process.env.EGOV_SYNTHETIC_SECRET;
  return value && value.length >= 32 ? value : null;
};
export const syntheticEgovAvailable = () => Boolean(secret());
const hash = (value: string | Buffer) =>
  crypto.createHash("sha256").update(value).digest();
const safeProfile = (value: unknown): SyntheticEgovProfile | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  if (
    typeof profile.uniqid !== "string" ||
    !/^[A-Za-z0-9._:-]{1,200}$/.test(profile.uniqid)
  )
    return null;
  if (
    profile.displayName !== undefined &&
    (typeof profile.displayName !== "string" ||
      profile.displayName.length > 200)
  )
    return null;
  return {
    uniqid: profile.uniqid,
    ...(profile.displayName === undefined
      ? {}
      : { displayName: profile.displayName }),
  };
};
export function issueSyntheticExchangeCode(
  profile: SyntheticEgovProfile,
  ttlMs = 5 * 60_000,
): string {
  const signingSecret = secret();
  if (!signingSecret) throw new Error("synthetic eGov secret unavailable");
  const approved = safeProfile(profile);
  if (!approved) throw new Error("invalid synthetic eGov profile");
  const payload = Buffer.from(
    JSON.stringify({
      ...approved,
      exp: Date.now() + ttlMs,
      nonce: crypto.randomBytes(16).toString("base64url"),
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}
export function exchangeSyntheticCode(
  code: unknown,
  mode: RuntimeMode,
): SyntheticEgovProfile | null {
  if (mode !== "synthetic" || typeof code !== "string") return null;
  const signingSecret = secret();
  if (!signingSecret) return null;
  const segments = code.split(".");
  if (segments.length !== 2) return null;
  const [payload, signature] = segments;
  if (!payload || !signature) return null;
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("base64url");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    const profile = safeProfile(value);
    return profile && value.exp > Date.now()
      ? { ...profile, expiresAt: new Date(value.exp) }
      : null;
  } catch {
    return null;
  }
}

export async function completeEgovFirstLogin(
  code: string,
  invitationToken: string,
  profile: SyntheticEgovProfile,
  pool: Pick<Pool, "connect"> = getPool(),
) {
  const client = await pool.connect();
  const codeHash = hash(code);
  const invitationHash = hash(invitationToken);
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  try {
    await client.query("BEGIN");
    const tx = await client.query(
      "SELECT id FROM egov_exchange_transactions WHERE code_hash=$1 FOR UPDATE",
      [codeHash],
    );
    if (tx.rowCount) throw new Error("invalid exchange");
    const invitation = await client.query(
      `UPDATE invitations SET consumed_at=now() WHERE token_hash=$1 AND purpose='admission' AND role='citizen' AND consumed_at IS NULL AND expires_at>now() RETURNING id`,
      [invitationHash],
    );
    if (!invitation.rowCount) throw new Error("invalid invitation");
    const storedProfile = {
      uniqid: profile.uniqid,
      ...(profile.displayName === undefined
        ? {}
        : { displayName: profile.displayName }),
    };
    await client.query(
      "INSERT INTO egov_exchange_transactions(code_hash, invitation_id, uniqid, expires_at, consumed_at) VALUES($1,$2,$3,$4,now())",
      [
        codeHash,
        invitation.rows[0].id,
        profile.uniqid,
        profile.expiresAt ?? new Date(Date.now() + 5 * 60_000),
      ],
    );
    let identity = await client.query(
      "SELECT account_id FROM egov_identities WHERE uniqid=$1 FOR UPDATE",
      [profile.uniqid],
    );
    let account;
    if (identity.rowCount) {
      account = (
        await client.query(
          "SELECT id,role,display_name,service_scope,hospital_id FROM accounts WHERE id=$1 AND role='citizen' AND status='active'",
          [identity.rows[0].account_id],
        )
      ).rows[0];
      if (!account) throw new Error("invalid identity");
    } else {
      account = (
        await client.query(
          `INSERT INTO accounts(login_identity,display_name,role,service_scope) VALUES($1,$2,'citizen','{}') RETURNING id,role,display_name,service_scope,hospital_id`,
          [`egov:${profile.uniqid}`, profile.displayName ?? null],
        )
      ).rows[0];
      await client.query(
        "INSERT INTO egov_identities(account_id,uniqid,profile) VALUES($1,$2,$3)",
        [account.id, profile.uniqid, storedProfile],
      );
    }
    await client.query(
      "INSERT INTO sessions(account_id,token_hash,expires_at) VALUES($1,$2,now()+$3::interval)",
      [account.id, hash(sessionToken), `${SESSION_TTL_MS} milliseconds`],
    );
    await client.query(
      "INSERT INTO audit_events(actor_account_id, action, target_reference, source, details) VALUES($1,'egov.first_login',$1,'egov.synthetic', $2)",
      [account.id, JSON.stringify({ invitationId: invitation.rows[0].id })],
    );
    await client.query("COMMIT");
    return { token: sessionToken, account: publicAccount(account) };
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return null;
  } finally {
    client.release();
  }
}

/** Complete either a returning eGov exchange or the invited first exchange. */
export async function completeEgovLogin(
  code: string,
  invitationToken: string | undefined,
  profile: SyntheticEgovProfile,
  pool: Pick<Pool, "connect"> = getPool(),
) {
  const client = await pool.connect();
  const codeHash = hash(code);
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  try {
    await client.query("BEGIN");
    const tx = await client.query(
      "SELECT id FROM egov_exchange_transactions WHERE code_hash=$1 FOR UPDATE",
      [codeHash],
    );
    if (tx.rowCount) throw new Error("invalid exchange");
    const identity = await client.query(
      "SELECT account_id FROM egov_identities WHERE uniqid=$1 FOR UPDATE",
      [profile.uniqid],
    );
    let account: Record<string, unknown>;
    let invitationId: string | null = null;
    if (identity.rowCount) {
      const result = await client.query(
        "SELECT id,role,display_name,service_scope,hospital_id FROM accounts WHERE id=$1 AND role='citizen' AND status='active'",
        [identity.rows[0].account_id],
      );
      if (!result.rowCount) throw new Error("invalid identity");
      account = result.rows[0];
      const refreshed = {
        uniqid: profile.uniqid,
        ...(profile.displayName === undefined
          ? {}
          : { displayName: profile.displayName }),
      };
      await client.query(
        "UPDATE egov_identities SET profile=$1, updated_at=now() WHERE uniqid=$2",
        [refreshed, profile.uniqid],
      );
      if (profile.displayName !== undefined)
        await client.query(
          "UPDATE accounts SET display_name=$1, updated_at=now() WHERE id=$2 AND role='citizen' AND status='active'",
          [profile.displayName, account.id],
        );
    } else {
      if (typeof invitationToken !== "string")
        throw new Error("invalid invitation");
      const invitation = await client.query(
        `UPDATE invitations SET consumed_at=now() WHERE token_hash=$1 AND purpose='admission' AND role='citizen' AND consumed_at IS NULL AND expires_at>now() RETURNING id`,
        [hash(invitationToken)],
      );
      if (!invitation.rowCount) throw new Error("invalid invitation");
      invitationId = invitation.rows[0].id;
      const storedProfile = {
        uniqid: profile.uniqid,
        ...(profile.displayName === undefined
          ? {}
          : { displayName: profile.displayName }),
      };
      account = (
        await client.query(
          `INSERT INTO accounts(login_identity,display_name,role,service_scope) VALUES($1,$2,'citizen','{}') RETURNING id,role,display_name,service_scope,hospital_id`,
          [`egov:${profile.uniqid}`, profile.displayName ?? null],
        )
      ).rows[0];
      await client.query(
        "INSERT INTO egov_identities(account_id,uniqid,profile) VALUES($1,$2,$3)",
        [account.id, profile.uniqid, storedProfile],
      );
    }
    const exchange = await client.query(
      "INSERT INTO egov_exchange_transactions(code_hash, invitation_id, uniqid, expires_at, consumed_at) VALUES($1,$2,$3,$4,now()) RETURNING id",
      [
        codeHash,
        invitationId,
        profile.uniqid,
        profile.expiresAt ?? new Date(Date.now() + 5 * 60_000),
      ],
    );
    await client.query(
      "INSERT INTO egov_verification_history(account_id,uniqid,profile,source,exchange_transaction_id) VALUES($1,$2,$3,$4,$5)",
      [
        account.id,
        profile.uniqid,
        {
          ...(profile.displayName === undefined
            ? {}
            : { displayName: profile.displayName }),
        },
        "egov.synthetic",
        exchange.rows[0].id,
      ],
    );
    await client.query(
      "INSERT INTO sessions(account_id,token_hash,expires_at) VALUES($1,$2,now()+$3::interval)",
      [account.id, hash(sessionToken), `${SESSION_TTL_MS} milliseconds`],
    );
    await client.query(
      "INSERT INTO audit_events(actor_account_id, action, target_reference, source, details) VALUES($1,'egov.login',$1,'egov.synthetic',$2)",
      [account.id, JSON.stringify({ invitationId })],
    );
    await client.query("COMMIT");
    return { token: sessionToken, account: publicAccount(account) };
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return null;
  } finally {
    client.release();
  }
}
