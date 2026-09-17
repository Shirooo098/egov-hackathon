import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { Pool } from "pg";
import { isLiveMode } from "../runtime/config.js";
import type { RuntimeMode } from "../runtime/config.js";

export interface ReleaseEvidenceRecord {
  releaseId: string;
  timestamp: string;
  sourceControl: {
    commitSha: string;
    branch: string;
    isClean: boolean;
    repository: string;
    sourceTreeSha256: string;
  };
  environment: {
    mode: RuntimeMode;
    isLive: boolean;
    nodeVersion: string;
    platform: string;
    nodeEnv: string;
    databaseTarget: "isolated-test" | "configured-runtime";
  };
  verificationChecks: MeasuredCheck[];
  database: {
    latestMigration: string;
    totalMigrations: number;
    forwardOnlyEnforced: boolean;
    blankBoundaryVerified: boolean;
    syntheticSeedSeparated: boolean;
    state: {
      syntheticHospitals: number;
      activeCases: number;
      deceasedOffers: number;
      signedEvents: number;
      resetAudits: number;
    };
  };
  securityAndAuthority: {
    checks: MeasuredCheck[];
  };
  concurrencyTest: {
    probe: "read_only_pool_probe";
    concurrentRequests: number;
    successfulRequests: number;
    failedRequests: number;
    duplicateStateViolations: number;
    poolExhaustions: number;
    durationMs: number;
    passed: boolean;
  };
  stateIntegrityCoverage: {
    checks: MeasuredCheck[];
    passed: boolean;
  };
  accessibility: { checks: MeasuredCheck[] };
  buildArtifacts: {
    clientDistSha256: string;
    migrationsSha256: string;
  };
  accountableSignoff: {
    operator: string;
    reviewStatus: "VERIFIED_SYNTHETIC_DEMO";
    retainedArtifactPath: string;
  };
  immutableEvidenceHash: string;
}

export type MeasuredCheckStatus = "passed" | "failed" | "skipped";
export interface MeasuredCheck {
  category: string;
  command: string;
  status: MeasuredCheckStatus;
  durationMs: number;
  timestamp: string;
  details?: string;
  output?: string;
}

function databaseIdentity(value: string): string {
  try {
    const url = new URL(value);
    const authority =
      value
        .slice(value.indexOf("//") + 2)
        .split(/[/?#]/, 1)[0]
        .split("@")
        .pop() || "";
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length <= 1 ||
      /%[0-9a-f]{2}/i.test(authority) ||
      url.searchParams.has("host") ||
      url.searchParams.has("port")
    )
      throw new Error("invalid database target");
    const port = url.port || "5432";
    return `postgres://${url.hostname.toLowerCase().replace(/\.$/, "")}:${port}/${decodeURI(url.pathname.slice(1))}`;
  } catch {
    throw new Error("Invalid database target for isolation check");
  }
}

export function validateIsolatedTestDatabaseTargets(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const testTargets = [env.TEST_DATABASE_URL, env.TEST_DATABASE_DIRECT_URL];
  const runtimeTargets = [env.DATABASE_URL, env.DATABASE_DIRECT_URL]
    .filter(Boolean)
    .map((value) => databaseIdentity(value!));
  if (
    !runtimeTargets.length ||
    testTargets.some((value) => !value) ||
    testTargets.some((value) =>
      runtimeTargets.includes(databaseIdentity(value!)),
    )
  ) {
    throw new Error(
      "Isolated TEST_DATABASE_URL and TEST_DATABASE_DIRECT_URL must be present and distinct from runtime database targets",
    );
  }
}

const REQUIRED_CHECK_CATEGORIES = [
  "client",
  "server",
  "build",
  "reset",
  "rejection",
  "reconciliation",
  "security",
  "accessibility",
  "scenario",
  "keyboard",
  "screen_reader",
  "contrast",
  "responsive",
  "walkthrough",
  "state_integrity_appointments",
  "state_integrity_workflows",
  "state_integrity_foundation",
] as const;

function assertMeasuredChecks(checks: MeasuredCheck[]): void {
  const categories = new Set(checks.map((check) => check.category));
  const missing = REQUIRED_CHECK_CATEGORIES.filter(
    (category) => !categories.has(category),
  );
  const invalid = checks.filter(
    (check) => !check.command || !check.timestamp || check.durationMs < 0,
  );
  const failed = checks.filter((check) => check.status !== "passed");
  if (missing.length || invalid.length || failed.length) {
    throw new Error(
      `Synthetic demo verification incomplete: missing=${missing.join(",") || "none"}, failed=${failed.length}`,
    );
  }
}

function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }
  if (Buffer.isBuffer(obj)) {
    return JSON.stringify(obj.toString("hex"));
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) =>
      JSON.stringify(k) +
      ":" +
      canonicalize((obj as Record<string, unknown>)[k]),
  );
  return "{" + pairs.join(",") + "}";
}

function computeDirectoryHash(dirPath: string): string {
  if (!fs.existsSync(dirPath)) return "0".repeat(64);
  const hash = crypto.createHash("sha256");

  function walk(current: string) {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const fileData = fs.readFileSync(fullPath);
        hash.update(path.relative(dirPath, fullPath) + ":");
        hash.update(fileData);
      }
    }
  }

  walk(dirPath);
  return hash.digest("hex");
}

function computeSourceTreeHash(repoRoot: string): string {
  let files: string[];
  try {
    files = execSync("git ls-files -co --exclude-standard", {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((file) => {
        const normalized = file.replaceAll("\\", "/");
        return (
          !normalized.startsWith("node_modules/") &&
          !normalized.startsWith("dist/") &&
          !normalized.startsWith(".scratch/production-capable-mvp/") &&
          !normalized.startsWith(
            ".scratch/synthetic-hospital-demo/evidence/",
          ) &&
          !normalized.endsWith(".tsbuildinfo")
        );
      })
      .sort();
  } catch {
    return "0".repeat(64);
  }
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) continue;
    hash.update(file.replaceAll("\\", "/") + ":");
    hash.update(fs.readFileSync(fullPath));
  }
  return hash.digest("hex");
}

export async function run100ConcurrentSyntheticRequests(
  handler: (
    requestId: string,
    index: number,
  ) => Promise<{
    success: boolean;
    data?: { stateKey: string } & Record<string, unknown>;
    error?: unknown;
  }>,
): Promise<{
  concurrentRequests: number;
  successfulRequests: number;
  failedRequests: number;
  duplicateStateViolations: number;
  poolExhaustions: number;
  durationMs: number;
  passed: boolean;
}> {
  const count = 100;
  const startTime = Date.now();
  const ids = Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    index: i,
  }));

  const results = await Promise.allSettled(
    ids.map(({ id, index }) => handler(id, index)),
  );

  const durationMs = Date.now() - startTime;
  let successful = 0;
  let failed = 0;
  let duplicateViolations = 0;
  let poolExhaustions = 0;

  const seenIds = new Set<string>();

  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.success) {
        successful++;
        const stateKey =
          r.value.data &&
          typeof r.value.data === "object" &&
          "stateKey" in r.value.data
            ? String((r.value.data as { stateKey: unknown }).stateKey)
            : "";
        if (!stateKey || seenIds.has(stateKey)) duplicateViolations++;
        else seenIds.add(stateKey);
      } else {
        failed++;
        const errMsg = String(r.value.error || "");
        if (errMsg.includes("pool") || errMsg.includes("connection"))
          poolExhaustions++;
      }
    } else {
      failed++;
      const errMsg = String(r.reason);
      if (errMsg.includes("pool") || errMsg.includes("connection"))
        poolExhaustions++;
    }
  }

  const passed =
    successful === count && duplicateViolations === 0 && poolExhaustions === 0;

  return {
    concurrentRequests: count,
    successfulRequests: successful,
    failedRequests: failed,
    duplicateStateViolations: duplicateViolations,
    poolExhaustions,
    durationMs,
    passed,
  };
}

export async function generateSyntheticDemoEvidence(options: {
  pool: Pool;
  operator?: string;
  checks: MeasuredCheck[];
  concurrencyHandler?: (
    id: string,
    index: number,
  ) => Promise<{
    success: boolean;
    data?: { stateKey: string } & Record<string, unknown>;
  }>;
  artifactName?: string;
}): Promise<ReleaseEvidenceRecord> {
  const { pool } = options;
  assertMeasuredChecks(options.checks);
  const releaseId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const mode = (process.env.EBUHAY_MODE as RuntimeMode) || "synthetic";
  if (mode !== "synthetic" || process.env.SYNTHETIC_MODE !== "true")
    throw new Error(
      "Synthetic demo evidence is disabled outside synthetic mode",
    );
  validateIsolatedTestDatabaseTargets();
  const reviewer = options.operator?.trim();
  if (!reviewer)
    throw new Error(
      "An explicit reviewer is required for synthetic demo evidence",
    );
  const artifactName = options.artifactName ?? "release-evidence-v1.json";
  if (!/^release-evidence-[a-z0-9-]+\.json$/.test(artifactName))
    throw new Error("Invalid synthetic evidence artifact name");

  // 1. Git metadata
  let commitSha = "HEAD";
  let branch = "main";
  let isClean = false;
  try {
    commitSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
    const status = execSync("git status --porcelain", {
      encoding: "utf8",
    }).trim();
    isClean = status.length === 0;
  } catch {}

  // 2. Database schema verification
  const databaseStarted = Date.now();
  const migRes = await pool.query(
    "SELECT version FROM schema_migrations ORDER BY version ASC",
  );
  const versions = migRes.rows.map((r: { version: string }) => r.version);
  const latestMigration = versions[versions.length - 1] || "000_none";
  const migrationsPath = path.resolve(process.cwd(), "src/db/migrations");
  const sourceMigrations = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => file.replace(/\.sql$/, ""));
  const forwardOnlyEnforced =
    versions.length === sourceMigrations.length &&
    versions.every((version, index) => version === sourceMigrations[index]);
  const stateResult = await pool.query(
    `SELECT
    (SELECT count(*)::int FROM hospitals WHERE synthetic=true) AS synthetic_hospitals,
    (SELECT count(*)::int FROM citizen_cases c JOIN hospitals h ON h.id=c.hospital_id WHERE h.synthetic=true AND c.status='active') AS active_cases,
    (SELECT count(*)::int FROM deceased_offers) AS deceased_offers,
    (SELECT count(*)::int FROM hospital_source_events WHERE schema_version=$1) AS signed_events,
    (SELECT count(*)::int FROM audit_events WHERE action='operations.synthetic_reset') AS reset_audits`,
    ["synthetic-hospital-event.v1"],
  );
  const stateRow = stateResult.rows[0];
  const databaseState = {
    syntheticHospitals: Number(stateRow.synthetic_hospitals),
    activeCases: Number(stateRow.active_cases),
    deceasedOffers: Number(stateRow.deceased_offers),
    signedEvents: Number(stateRow.signed_events),
    resetAudits: Number(stateRow.reset_audits),
  };

  // Verify no synthetic records exist if in live mode
  const blankBoundaryVerified = isLiveMode(mode)
    ? databaseState.syntheticHospitals === 0
    : databaseState.syntheticHospitals > 0;
  const syntheticSeedSeparated = isLiveMode(mode)
    ? databaseState.syntheticHospitals === 0
    : databaseState.activeCases > 0 && databaseState.deceasedOffers >= 5;
  if (!forwardOnlyEnforced || !blankBoundaryVerified || !syntheticSeedSeparated)
    throw new Error(
      "Synthetic demo database verification failed; evidence was not written",
    );

  // 3. Concurrency check: 100 concurrent requests
  let concurrencyResult;
  if (options.concurrencyHandler) {
    concurrencyResult = await run100ConcurrentSyntheticRequests(
      options.concurrencyHandler,
    );
  } else {
    // Default safe transactional idempotent probe
    concurrencyResult = await run100ConcurrentSyntheticRequests(
      async (reqId) => {
        // Execute transactional read/verify probe against pool
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const probeRes = await client.query(
            "SELECT $1::text AS state_key, count(*) FROM schema_migrations",
            [reqId],
          );
          await client.query("COMMIT");
          return {
            success: probeRes.rowCount !== null,
            data: { stateKey: probeRes.rows[0].state_key },
          };
        } catch (err) {
          await client.query("ROLLBACK");
          return { success: false, error: err };
        } finally {
          client.release();
        }
      },
    );
  }
  if (!concurrencyResult.passed) {
    throw new Error(
      "Synthetic demo concurrency verification failed; evidence was not written",
    );
  }
  const measuredChecks = [
    ...options.checks,
    {
      category: "database",
      command: "schema and synthetic baseline queries",
      status: "passed" as const,
      durationMs: Date.now() - databaseStarted,
      timestamp,
    },
    {
      category: "concurrency",
      command: "run100ConcurrentSyntheticRequests",
      status: "passed" as const,
      durationMs: concurrencyResult.durationMs,
      timestamp,
    },
  ];
  const stateIntegrityChecks = measuredChecks.filter(
    (check) =>
      check.category === "reset" ||
      check.category.startsWith("state_integrity_"),
  );

  // 4. Artifact hashes
  const clientDistPath = path.resolve(process.cwd(), "../client/dist");
  const clientDistSha256 = computeDirectoryHash(clientDistPath);
  const migrationsSha256 = computeDirectoryHash(migrationsPath);
  const sourceTreeSha256 = computeSourceTreeHash(
    path.resolve(process.cwd(), ".."),
  );
  if (
    [clientDistSha256, migrationsSha256, sourceTreeSha256].some((hash) =>
      /^0+$/.test(hash),
    )
  )
    throw new Error(
      "Synthetic demo artifact hashing failed; evidence was not written",
    );

  // 5. Build preliminary record
  const recordWithoutHash: Omit<
    ReleaseEvidenceRecord,
    "immutableEvidenceHash"
  > = {
    releaseId,
    timestamp,
    sourceControl: {
      commitSha,
      branch,
      isClean,
      repository: "https://github.com/Shirooo098/egov-hackathon",
      sourceTreeSha256,
    },
    environment: {
      mode,
      isLive: isLiveMode(mode),
      nodeVersion: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV || "unset",
      databaseTarget:
        process.env.NODE_ENV === "test"
          ? "isolated-test"
          : "configured-runtime",
    },
    verificationChecks: measuredChecks,
    database: {
      latestMigration,
      totalMigrations: versions.length,
      forwardOnlyEnforced,
      blankBoundaryVerified,
      syntheticSeedSeparated,
      state: databaseState,
    },
    securityAndAuthority: {
      checks: measuredChecks.filter((check) =>
        ["security", "reset", "rejection", "reconciliation"].includes(
          check.category,
        ),
      ),
    },
    concurrencyTest: { probe: "read_only_pool_probe", ...concurrencyResult },
    stateIntegrityCoverage: {
      checks: stateIntegrityChecks,
      passed:
        stateIntegrityChecks.length > 0 &&
        stateIntegrityChecks.every((check) => check.status === "passed"),
    },
    accessibility: {
      checks: measuredChecks.filter(
        (check) => check.category === "accessibility",
      ),
    },
    buildArtifacts: {
      clientDistSha256,
      migrationsSha256,
    },
    accountableSignoff: {
      operator: reviewer,
      reviewStatus: "VERIFIED_SYNTHETIC_DEMO",
      retainedArtifactPath: `.scratch/synthetic-hospital-demo/evidence/${artifactName}`,
    },
  };

  const canonical = canonicalize(recordWithoutHash);
  const immutableEvidenceHash = crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex");

  const fullRecord: ReleaseEvidenceRecord = {
    ...recordWithoutHash,
    immutableEvidenceHash,
  };

  // 6. Write retained evidence file
  const evidenceDir = path.resolve(
    process.cwd(),
    "../.scratch/synthetic-hospital-demo/evidence",
  );
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  const evidenceFile = path.join(evidenceDir, artifactName);
  const temporaryFile = path.join(
    evidenceDir,
    `.${artifactName}.${releaseId}.tmp`,
  );
  try {
    fs.writeFileSync(
      temporaryFile,
      JSON.stringify(fullRecord, null, 2),
      "utf8",
    );
    fs.renameSync(temporaryFile, evidenceFile);
  } catch (error) {
    fs.rmSync(temporaryFile, { force: true });
    throw error;
  }

  return fullRecord;
}
