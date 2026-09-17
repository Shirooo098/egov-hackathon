import { sql } from "drizzle-orm";

export interface WorkflowPauseCheck {
  paused: boolean;
  switchId?: string;
  scope?: string;
  hospitalId?: string | null;
  reason?: string;
  pausedAt?: string;
  pausedBy?: string;
}

export const VALID_WORKFLOW_SCOPES = [
  "all",
  "intake",
  "appointments",
  "notifications",
  "hospital_events",
  "messaging",
  "reconciliation",
  "matching",
  "privacy_requests",
] as const;

export type WorkflowScope = (typeof VALID_WORKFLOW_SCOPES)[number];

export async function isWorkflowPaused(
  db: any,
  scope: string,
  hospitalId?: string | null,
): Promise<WorkflowPauseCheck> {
  const query = hospitalId
    ? sql`
        SELECT id, scope, hospital_id AS "hospitalId", reason, paused_at AS "pausedAt", paused_by AS "pausedBy"
        FROM workflow_kill_switches
        WHERE status = 'active'
          AND (scope = 'all' OR scope = ${scope})
          AND (hospital_id IS NULL OR hospital_id = ${hospitalId})
        ORDER BY CASE WHEN scope = 'all' THEN 1 ELSE 0 END ASC
        LIMIT 1
      `
    : sql`
        SELECT id, scope, hospital_id AS "hospitalId", reason, paused_at AS "pausedAt", paused_by AS "pausedBy"
        FROM workflow_kill_switches
        WHERE status = 'active'
          AND (scope = 'all' OR scope = ${scope})
          AND hospital_id IS NULL
        ORDER BY CASE WHEN scope = 'all' THEN 1 ELSE 0 END ASC
        LIMIT 1
      `;

  const result = await db.execute(query);
  if (result.rows.length > 0) {
    const row = result.rows[0] as any;
    return {
      paused: true,
      switchId: row.id,
      scope: row.scope,
      hospitalId: row.hospitalId,
      reason: row.reason,
      pausedAt: row.pausedAt,
      pausedBy: row.pausedBy,
    };
  }

  return { paused: false };
}

export async function pauseWorkflow(
  db: any,
  params: {
    scope: string;
    hospitalId?: string | null;
    reason: string;
    actorAccountId: string;
  },
) {
  const { scope, hospitalId = null, reason, actorAccountId } = params;

  if (!VALID_WORKFLOW_SCOPES.includes(scope as any)) {
    throw new Error(
      `Invalid workflow scope: ${scope}. Must be one of: ${VALID_WORKFLOW_SCOPES.join(", ")}`,
    );
  }

  if (!reason || !reason.trim()) {
    throw new Error("Kill switch reason is required");
  }

  // Check if an active kill switch already exists for this scope & hospital
  const existing = await db.execute(sql`
    SELECT id FROM workflow_kill_switches
    WHERE scope = ${scope}
      AND status = 'active'
      AND ((hospital_id IS NULL AND ${hospitalId}::uuid IS NULL) OR hospital_id = ${hospitalId})
  `);

  if (existing.rowCount) {
    return { alreadyEngaged: true, id: (existing.rows[0] as any).id };
  }

  const inserted = await db.execute(sql`
    INSERT INTO workflow_kill_switches(scope, hospital_id, status, reason, paused_by, paused_at)
    VALUES (${scope}, ${hospitalId || null}, 'active', ${reason.trim()}, ${actorAccountId}, now())
    RETURNING id, scope, hospital_id AS "hospitalId", status, reason, paused_by AS "pausedBy", paused_at AS "pausedAt"
  `);

  await db.execute(sql`
    INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
    VALUES (${actorAccountId}, 'workflow_kill_switch_engaged', ${scope}, 'operations',
            ${JSON.stringify({ switchId: (inserted.rows[0] as any).id, scope, hospitalId, reason: reason.trim() })})
  `);

  return inserted.rows[0];
}

export async function resumeWorkflow(
  db: any,
  params: {
    id: string;
    reason: string;
    actorAccountId: string;
  },
) {
  const { id, reason, actorAccountId } = params;

  if (!reason || !reason.trim()) {
    throw new Error("Resume reason is required");
  }

  const check = await db.execute(sql`
    SELECT id, scope, hospital_id, status FROM workflow_kill_switches WHERE id = ${id}
  `);

  if (!check.rowCount) {
    throw new Error("Kill switch not found");
  }

  if ((check.rows[0] as any).status !== "active") {
    throw new Error("Kill switch is not currently active");
  }

  const updated = await db.execute(sql`
    UPDATE workflow_kill_switches
    SET status = 'resumed',
        resumed_by = ${actorAccountId},
        resumed_at = now(),
        resume_reason = ${reason.trim()},
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, scope, hospital_id AS "hospitalId", status, reason,
              paused_by AS "pausedBy", paused_at AS "pausedAt",
              resumed_by AS "resumedBy", resumed_at AS "resumedAt",
              resume_reason AS "resumeReason"
  `);

  await db.execute(sql`
    INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
    VALUES (${actorAccountId}, 'workflow_kill_switch_disengaged', ${(check.rows[0] as any).scope}, 'operations',
            ${JSON.stringify({ switchId: id, scope: (check.rows[0] as any).scope, resumeReason: reason.trim() })})
  `);

  return updated.rows[0];
}

export async function getOperationalMetrics(
  db: any,
  hospitalId?: string | null,
) {
  // 1. Backlog metrics
  const outboxRes = await db.execute(sql`
    SELECT count(*)::int AS "pendingCount" FROM appointment_outbox WHERE status = 'pending'
  `);
  const notificationRes = await db.execute(sql`
    SELECT count(*)::int AS "backlogCount",
           count(CASE WHEN last_error IS NOT NULL THEN 1 END)::int AS "failureCount",
           count(CASE WHEN delivered_at IS NOT NULL THEN 1 END)::int AS "deliveredCount"
    FROM notifications
  `);
  const reconciliationRes = await db.execute(sql`
    SELECT count(*)::int AS "pendingTasks" FROM follow_up_tasks WHERE status = 'pending'
  `);

  // 2. Active workflows
  const casesRes = await db.execute(sql`
    SELECT count(*)::int AS "activeCases" FROM citizen_cases WHERE status = 'active'
  `);
  const episodesRes = await db.execute(sql`
    SELECT count(*)::int AS "activeEpisodes" FROM episodes WHERE lifecycle = 'active'
  `);

  // 3. Holds and Kill Switches
  const holdsRes = await db.execute(sql`
    SELECT count(*)::int AS "activeHolds" FROM legal_holds WHERE status = 'active'
  `);
  const activeSwitchesRes = await db.execute(sql`
    SELECT id, scope, hospital_id AS "hospitalId", reason, paused_at AS "pausedAt"
    FROM workflow_kill_switches
    WHERE status = 'active'
    ORDER BY paused_at DESC
  `);

  // 4. Determine overall system health state
  const outboxPending = (outboxRes.rows[0] as any).pendingCount || 0;
  const failureCount = (notificationRes.rows[0] as any).failureCount || 0;
  const activeSwitches = activeSwitchesRes.rows || [];

  let healthStatus: "healthy" | "degraded" | "paused" = "healthy";
  if (activeSwitches.length > 0) {
    healthStatus = "paused";
  } else if (outboxPending > 50 || failureCount > 20) {
    healthStatus = "degraded";
  }

  // REDACTED / ZERO-DISCLOSURE: Only aggregate counts, rates, and operational states are returned.
  return {
    system: {
      status: healthStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    backlogs: {
      appointmentOutboxPending: outboxPending,
      notificationBacklog: (notificationRes.rows[0] as any).backlogCount || 0,
      notificationDeliveryFailures: failureCount,
      notificationDelivered:
        (notificationRes.rows[0] as any).deliveredCount || 0,
      reconciliationPendingTasks:
        (reconciliationRes.rows[0] as any).pendingTasks || 0,
    },
    activeWorkflows: {
      activeCases: (casesRes.rows[0] as any).activeCases || 0,
      activeEpisodes: (episodesRes.rows[0] as any).activeEpisodes || 0,
      activeLegalHolds: (holdsRes.rows[0] as any).activeHolds || 0,
      activeKillSwitchesCount: activeSwitches.length,
    },
    activeKillSwitches: activeSwitches.map((s: any) => ({
      id: s.id,
      scope: s.scope,
      hospitalId: s.hospitalId,
      reason: s.reason,
      pausedAt: s.pausedAt,
    })),
  };
}
