import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { requireSession, requireRole } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import type { RuntimeConfig } from '../runtime/config.js';
import { isLiveMode } from '../runtime/config.js';
import { getPool } from '../db/pool.js';
import { resetSyntheticData } from '../db/seeds/synthetic.js';
import {
  isWorkflowPaused,
  pauseWorkflow,
  resumeWorkflow,
  getOperationalMetrics,
  VALID_WORKFLOW_SCOPES,
} from '../services/operationsService.js';

/**
 * Middleware to check whether a specific workflow scope is paused by an active kill switch.
 * If paused, blocks mutation requests (POST, PUT, PATCH, DELETE) while allowing GET reads
 * so that evidence and status remain visible to operators.
 */
export function requireWorkflowActive(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only pause mutations; allow GET/HEAD reads to keep evidence visible
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    try {
      const db = getDb();
      let hospitalId = (req as any).account?.hospitalId || req.body?.hospitalId || req.params?.hospitalId || null;

      if (!hospitalId && req.body?.serviceId) {
        try {
          const srv = await db.execute(sql`SELECT hospital_id AS "hospitalId" FROM services WHERE id = ${req.body.serviceId}::uuid LIMIT 1`);
          if (srv.rowCount) {
            hospitalId = (srv.rows[0] as any).hospitalId;
          }
        } catch {}
      }

      if (!hospitalId && req.params?.caseId && req.params.caseId !== 'undefined') {
        try {
          const cs = await db.execute(sql`
            SELECT COALESCE(c.hospital_id, s.hospital_id) AS "hospitalId"
            FROM citizen_cases c
            LEFT JOIN services s ON s.id = c.service_id
            WHERE c.id = ${req.params.caseId}::uuid
            LIMIT 1
          `);
          if (cs.rowCount) {
            hospitalId = (cs.rows[0] as any).hospitalId;
          }
        } catch {}
      }

      const pauseCheck = await isWorkflowPaused(db, scope, hospitalId);

      if (pauseCheck.paused) {
        return res.status(423).json({
          success: false,
          error: 'workflow_paused',
          message: `The '${scope}' workflow is temporarily paused under an active operations kill switch.`,
          details: {
            scope: pauseCheck.scope,
            reason: pauseCheck.reason,
            pausedAt: pauseCheck.pausedAt,
          },
        });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function createOperationsRouter(config: RuntimeConfig) {
  const router = express.Router();
  const db = () => getDb();

  // GET /health - Public/Operational health summary
  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const activeSwitches = await db().execute(sql`
        SELECT scope, reason FROM workflow_kill_switches WHERE status = 'active'
      `);
      const isPaused = activeSwitches.rows.length > 0;
      return res.json({
        success: true,
        status: isPaused ? 'paused' : 'healthy',
        pausedWorkflowsCount: activeSwitches.rows.length,
      });
    } catch (err) {
      return next(err);
    }
  });

  // GET /metrics - Redacted operational metrics & backlog alerts
  router.get('/metrics', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await getOperationalMetrics(db(), req.account?.hospitalId);
      return res.json({ success: true, data: metrics });
    } catch (err) {
      return next(err);
    }
  });

  // GET /kill-switches - List active and historical kill switches (evidence remains visible)
  router.get('/kill-switches', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator', 'doctor'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;
      let query;
      if (statusFilter) {
        query = sql`
          SELECT ks.id, ks.scope, ks.hospital_id AS "hospitalId", ks.status, ks.reason,
                 ks.paused_at AS "pausedAt", ks.resumed_at AS "resumedAt",
                 ks.resume_reason AS "resumeReason", ks.created_at AS "createdAt",
                 a1.display_name AS "pausedByName", a2.display_name AS "resumedByName",
                 h.name AS "hospitalName"
          FROM workflow_kill_switches ks
          JOIN accounts a1 ON a1.id = ks.paused_by
          LEFT JOIN accounts a2 ON a2.id = ks.resumed_by
          LEFT JOIN hospitals h ON h.id = ks.hospital_id
          WHERE ks.status = ${statusFilter}
          ORDER BY ks.paused_at DESC
        `;
      } else {
        query = sql`
          SELECT ks.id, ks.scope, ks.hospital_id AS "hospitalId", ks.status, ks.reason,
                 ks.paused_at AS "pausedAt", ks.resumed_at AS "resumedAt",
                 ks.resume_reason AS "resumeReason", ks.created_at AS "createdAt",
                 a1.display_name AS "pausedByName", a2.display_name AS "resumedByName",
                 h.name AS "hospitalName"
          FROM workflow_kill_switches ks
          JOIN accounts a1 ON a1.id = ks.paused_by
          LEFT JOIN accounts a2 ON a2.id = ks.resumed_by
          LEFT JOIN hospitals h ON h.id = ks.hospital_id
          ORDER BY ks.paused_at DESC
        `;
      }

      const result = await db().execute(query);
      return res.json({ success: true, data: { items: result.rows } });
    } catch (err) {
      return next(err);
    }
  });

  // GET /kill-switches/:id - View single kill switch record
  router.get('/kill-switches/:id', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator', 'doctor'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db().execute(sql`
        SELECT ks.id, ks.scope, ks.hospital_id AS "hospitalId", ks.status, ks.reason,
               ks.paused_at AS "pausedAt", ks.resumed_at AS "resumedAt",
               ks.resume_reason AS "resumeReason", ks.created_at AS "createdAt",
               a1.display_name AS "pausedByName", a2.display_name AS "resumedByName",
               h.name AS "hospitalName"
        FROM workflow_kill_switches ks
        JOIN accounts a1 ON a1.id = ks.paused_by
        LEFT JOIN accounts a2 ON a2.id = ks.resumed_by
        LEFT JOIN hospitals h ON h.id = ks.hospital_id
        WHERE ks.id = ${req.params.id}
      `);

      if (!result.rowCount) {
        return res.status(404).json({ success: false, error: 'kill_switch_not_found', message: 'Kill switch record not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // POST /kill-switches - Engage a workflow or integration kill switch
  router.post('/kill-switches', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scope, hospitalId, reason } = req.body || {};

      if (!scope || typeof scope !== 'string' || !scope.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_scope', message: 'Scope is required' });
      }

      if (!VALID_WORKFLOW_SCOPES.includes(scope.trim() as any)) {
        return res.status(400).json({
          success: false,
          error: 'invalid_scope',
          message: `Scope must be one of: ${VALID_WORKFLOW_SCOPES.join(', ')}`,
        });
      }

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_reason', message: 'Kill switch engagement reason is required' });
      }

      const switchRecord = await pauseWorkflow(db(), {
        scope: scope.trim(),
        hospitalId: hospitalId || req.account?.hospitalId || null,
        reason: reason.trim(),
        actorAccountId: req.account!.id,
      });

      return res.status(201).json({ success: true, data: switchRecord });
    } catch (err) {
      return next(err);
    }
  });

  // POST /kill-switches/:id/resume - Disengage / resume paused workflow
  router.post('/kill-switches/:id/resume', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resumeReason } = req.body || {};

      if (!resumeReason || typeof resumeReason !== 'string' || !resumeReason.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_resume_reason', message: 'Resume reason is required' });
      }

      const updated = await resumeWorkflow(db(), {
        id: String(req.params.id),
        reason: resumeReason.trim(),
        actorAccountId: req.account!.id,
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  });

  // GET /kill-switches/check/:scope - Query pause status for a scope
  router.get('/kill-switches/check/:scope', requireSession, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hospitalId = typeof req.query.hospitalId === 'string' ? req.query.hospitalId : req.account?.hospitalId || null;
      const pauseCheck = await isWorkflowPaused(db(), String(req.params.scope), hospitalId);
      return res.json({ success: true, data: pauseCheck });
    } catch (err) {
      return next(err);
    }
  });

  // POST /reset - hospital_admin console reset for synthetic fixtures
  router.post('/reset', requireSession, requireSameOrigin, requireRole('hospital_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (isLiveMode(config.mode) || config.mode !== 'synthetic' || process.env.SYNTHETIC_MODE !== 'true') {
        return res.status(403).json({
          success: false,
          error: 'reset_disabled',
          message: 'Console reset is strictly prohibited outside synthetic mode',
        });
      }

      const { confirm, confirmation } = req.body || {};
      if (confirm !== true && confirmation !== 'RESET_SYNTHETIC_DATA') {
        return res.status(400).json({
          success: false,
          error: 'confirmation_required',
          message: 'Explicit confirmation is required to reset synthetic fixtures',
        });
      }

      const pool = getPool();
      const result = await resetSyntheticData(pool, req.account!.id);

      return res.status(200).json({
        success: true,
        message: 'Synthetic fixtures reset successfully',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createOperationsRouter;
