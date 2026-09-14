import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { getDb } from '../db/client.js';
import { requireSession, requireRole } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import type { RuntimeConfig } from '../runtime/config.js';
import {
  checkActiveLegalHold,
  computeDeletionVerificationHash,
  executeDefensibleDeletion,
} from '../services/retentionService.js';

export function createRetentionRouter(config: RuntimeConfig) {
  const router = express.Router();
  const db = () => getDb();

  // -------------------------------------------------------------
  // 1. Retention Policies (Configurable by record class, no universal 30-day default)
  // -------------------------------------------------------------

  // GET /policies - List approved retention policies
  router.get('/policies', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator', 'doctor'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db().execute(sql`
        SELECT id, record_class AS "recordClass", retention_days AS "retentionDays",
               legal_basis AS "legalBasis", approved_by AS "approvedBy",
               approved_at AS "approvedAt", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM retention_policies
        ORDER BY record_class ASC
      `);
      return res.json({ success: true, data: { items: result.rows } });
    } catch (err) {
      return next(err);
    }
  });

  // POST /policies - Configure or update a retention policy by record class
  router.post('/policies', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recordClass, retentionDays, legalBasis, approvedBy } = req.body || {};

      if (!recordClass || typeof recordClass !== 'string' || !recordClass.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_record_class', message: 'Record class is required' });
      }

      // Explicit prohibition of universal/blanket retention period
      if (recordClass.trim() === '*' || recordClass.trim().toLowerCase() === 'all' || recordClass.trim().toLowerCase() === 'default') {
        return res.status(400).json({
          success: false,
          error: 'universal_retention_prohibited',
          message: 'Universal fixed retention periods are prohibited. Retention must be specifically configured by record class with legal counsel and partner approval.',
        });
      }

      const days = parseInt(retentionDays, 10);
      if (isNaN(days) || days <= 0) {
        return res.status(400).json({ success: false, error: 'invalid_retention_days', message: 'Retention days must be a positive integer' });
      }

      if (!legalBasis || typeof legalBasis !== 'string' || !legalBasis.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_legal_basis', message: 'Legal basis documentation is required' });
      }

      if (!approvedBy || typeof approvedBy !== 'string' || !approvedBy.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_approved_by', message: 'Accountable approver (counsel/DPO) is required' });
      }

      const result = await db().execute(sql`
        INSERT INTO retention_policies(record_class, retention_days, legal_basis, approved_by, approved_at, updated_at)
        VALUES (${recordClass.trim()}, ${days}, ${legalBasis.trim()}, ${approvedBy.trim()}, now(), now())
        ON CONFLICT (record_class) DO UPDATE
        SET retention_days = EXCLUDED.retention_days,
            legal_basis = EXCLUDED.legal_basis,
            approved_by = EXCLUDED.approved_by,
            approved_at = now(),
            updated_at = now()
        RETURNING id, record_class AS "recordClass", retention_days AS "retentionDays",
                  legal_basis AS "legalBasis", approved_by AS "approvedBy",
                  approved_at AS "approvedAt", created_at AS "createdAt", updated_at AS "updatedAt"
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${req.account!.id}, 'retention_policy_configured', ${recordClass.trim()}, 'retention',
                ${JSON.stringify({ recordClass: recordClass.trim(), retentionDays: days, legalBasis: legalBasis.trim(), approvedBy: approvedBy.trim() })})
      `);

      return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // -------------------------------------------------------------
  // 2. Legal Holds (Auditable by actor, reason, and time; suspends deletion)
  // -------------------------------------------------------------

  // POST /holds - Place a legal hold
  router.post('/holds', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference, targetType, targetId, recordClass, reason } = req.body || {};

      if (!reference || typeof reference !== 'string' || !reference.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_reference', message: 'Matter reference is required' });
      }

      const validTargetTypes = ['account', 'case', 'episode', 'record_class', 'global'];
      if (!targetType || !validTargetTypes.includes(targetType)) {
        return res.status(400).json({ success: false, error: 'invalid_target_type', message: `Target type must be one of: ${validTargetTypes.join(', ')}` });
      }

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_reason', message: 'Legal hold reason is required' });
      }

      // Check for reference uniqueness
      const existing = await db().execute(sql`
        SELECT id FROM legal_holds WHERE reference = ${reference.trim()}
      `);
      if (existing.rowCount) {
        return res.status(409).json({ success: false, error: 'hold_reference_exists', message: 'A legal hold with this reference already exists' });
      }

      const inserted = await db().execute(sql`
        INSERT INTO legal_holds(reference, target_type, target_id, record_class, reason, placed_by, placed_at, status)
        VALUES (${reference.trim()}, ${targetType}, ${targetId || null}, ${recordClass || null}, ${reason.trim()}, ${req.account!.id}, now(), 'active')
        RETURNING id, reference, target_type AS "targetType", target_id AS "targetId",
                  record_class AS "recordClass", reason, placed_by AS "placedBy",
                  placed_at AS "placedAt", status, created_at AS "createdAt"
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${req.account!.id}, 'legal_hold_placed', ${reference.trim()}, 'retention',
                ${JSON.stringify({ holdId: (inserted.rows[0] as any).id, reference: reference.trim(), targetType, targetId, reason: reason.trim() })})
      `);

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // GET /holds - List legal holds
  router.get('/holds', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator', 'doctor'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;
      let query;
      if (statusFilter) {
        query = sql`
          SELECT h.id, h.reference, h.target_type AS "targetType", h.target_id AS "targetId",
                 h.record_class AS "recordClass", h.reason, h.placed_by AS "placedBy",
                 h.placed_at AS "placedAt", h.status, h.released_by AS "releasedBy",
                 h.released_at AS "releasedAt", h.release_reason AS "releaseReason",
                 a.display_name AS "placedByDisplayName"
          FROM legal_holds h
          JOIN accounts a ON a.id = h.placed_by
          WHERE h.status = ${statusFilter}
          ORDER BY h.placed_at DESC
        `;
      } else {
        query = sql`
          SELECT h.id, h.reference, h.target_type AS "targetType", h.target_id AS "targetId",
                 h.record_class AS "recordClass", h.reason, h.placed_by AS "placedBy",
                 h.placed_at AS "placedAt", h.status, h.released_by AS "releasedBy",
                 h.released_at AS "releasedAt", h.release_reason AS "releaseReason",
                 a.display_name AS "placedByDisplayName"
          FROM legal_holds h
          JOIN accounts a ON a.id = h.placed_by
          ORDER BY h.placed_at DESC
        `;
      }

      const result = await db().execute(query);
      return res.json({ success: true, data: { items: result.rows } });
    } catch (err) {
      return next(err);
    }
  });

  // GET /holds/:id - View single legal hold with actor, reason, timestamps
  router.get('/holds/:id', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator', 'doctor'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db().execute(sql`
        SELECT h.id, h.reference, h.target_type AS "targetType", h.target_id AS "targetId",
               h.record_class AS "recordClass", h.reason, h.placed_by AS "placedBy",
               h.placed_at AS "placedAt", h.status, h.released_by AS "releasedBy",
               h.released_at AS "releasedAt", h.release_reason AS "releaseReason",
               h.created_at AS "createdAt", h.updated_at AS "updatedAt",
               a1.display_name AS "placedByName", a2.display_name AS "releasedByName"
        FROM legal_holds h
        LEFT JOIN accounts a1 ON a1.id = h.placed_by
        LEFT JOIN accounts a2 ON a2.id = h.released_by
        WHERE h.id = ${req.params.id}
      `);

      if (!result.rowCount) {
        return res.status(404).json({ success: false, error: 'hold_not_found', message: 'Legal hold not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // POST /holds/:id/release - Release an active legal hold
  router.post('/holds/:id/release', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { releaseReason } = req.body || {};
      if (!releaseReason || typeof releaseReason !== 'string' || !releaseReason.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_release_reason', message: 'Release reason is required' });
      }

      const check = await db().execute(sql`
        SELECT id, reference, status FROM legal_holds WHERE id = ${req.params.id}
      `);
      if (!check.rowCount) {
        return res.status(404).json({ success: false, error: 'hold_not_found', message: 'Legal hold not found' });
      }
      if ((check.rows[0] as any).status !== 'active') {
        return res.status(400).json({ success: false, error: 'hold_already_released', message: 'Legal hold is not active' });
      }

      const updated = await db().execute(sql`
        UPDATE legal_holds
        SET status = 'released',
            released_by = ${req.account!.id},
            released_at = now(),
            release_reason = ${releaseReason.trim()},
            updated_at = now()
        WHERE id = ${req.params.id}
        RETURNING id, reference, status, released_by AS "releasedBy", released_at AS "releasedAt", release_reason AS "releaseReason"
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${req.account!.id}, 'legal_hold_released', ${(check.rows[0] as any).reference}, 'retention',
                ${JSON.stringify({ holdId: req.params.id, releaseReason: releaseReason.trim() })})
      `);

      return res.json({ success: true, data: updated.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // -------------------------------------------------------------
  // 3. Two-Person Approved Deletion Workflow & Receipts
  // -------------------------------------------------------------

  // POST /deletion/proposals - Submit a deletion proposal
  router.post('/deletion/proposals', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin', 'coordinator'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recordClass, targetType, targetId, reason } = req.body || {};

      if (!recordClass || typeof recordClass !== 'string' || !recordClass.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_record_class', message: 'Record class is required' });
      }

      const validTargetTypes = ['account', 'case', 'episode', 'citizen_profile', 'notification'];
      if (!targetType || !validTargetTypes.includes(targetType)) {
        return res.status(400).json({ success: false, error: 'invalid_target_type', message: `Target type must be one of: ${validTargetTypes.join(', ')}` });
      }

      if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_target_id', message: 'Target ID is required' });
      }

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ success: false, error: 'invalid_reason', message: 'Deletion proposal reason is required' });
      }

      // Verify recordClass exists in retention_policies
      const policyRes = await db().execute(sql`
        SELECT id, record_class, retention_days, legal_basis
        FROM retention_policies
        WHERE record_class = ${recordClass.trim()}
      `);
      if (!policyRes.rowCount) {
        return res.status(400).json({
          success: false,
          error: 'unconfigured_record_class',
          message: `Record class '${recordClass.trim()}' has no approved retention policy configured`,
        });
      }
      const policy = policyRes.rows[0] as any;

      // Check for active legal holds blocking this target
      const holdCheck = await checkActiveLegalHold(db(), targetType, targetId.trim(), recordClass.trim());
      if (holdCheck.active) {
        return res.status(409).json({
          success: false,
          error: 'record_under_legal_hold',
          message: `Deletion proposal blocked: target is protected under active legal hold '${holdCheck.hold?.reference}'`,
          hold: holdCheck.hold,
        });
      }

      const inserted = await db().execute(sql`
        INSERT INTO deletion_requests(record_class, target_type, target_id, reason, retention_policy_id, proposer_account_id, proposed_at, status)
        VALUES (${recordClass.trim()}, ${targetType}, ${targetId.trim()}, ${reason.trim()}, ${policy.id}, ${req.account!.id}, now(), 'pending')
        RETURNING id, record_class AS "recordClass", target_type AS "targetType", target_id AS "targetId",
                  reason, proposer_account_id AS "proposerAccountId", proposed_at AS "proposedAt", status
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${req.account!.id}, 'deletion_proposed', ${targetId.trim()}, 'retention',
                ${JSON.stringify({ proposalId: (inserted.rows[0] as any).id, recordClass, targetType, targetId })})
      `);

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // GET /deletion/proposals - List deletion proposals
  router.get('/deletion/proposals', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;
      let query;
      if (statusFilter) {
        query = sql`
          SELECT dr.id, dr.record_class AS "recordClass", dr.target_type AS "targetType",
                 dr.target_id AS "targetId", dr.reason, dr.proposer_account_id AS "proposerAccountId",
                 dr.proposed_at AS "proposedAt", dr.status, dr.approver_account_id AS "approverAccountId",
                 dr.reviewed_at AS "reviewedAt", dr.review_decision_notes AS "reviewDecisionNotes",
                 dr.receipt_id AS "receiptId", a1.display_name AS "proposerName", a2.display_name AS "approverName"
          FROM deletion_requests dr
          JOIN accounts a1 ON a1.id = dr.proposer_account_id
          LEFT JOIN accounts a2 ON a2.id = dr.approver_account_id
          WHERE dr.status = ${statusFilter}
          ORDER BY dr.proposed_at DESC
        `;
      } else {
        query = sql`
          SELECT dr.id, dr.record_class AS "recordClass", dr.target_type AS "targetType",
                 dr.target_id AS "targetId", dr.reason, dr.proposer_account_id AS "proposerAccountId",
                 dr.proposed_at AS "proposedAt", dr.status, dr.approver_account_id AS "approverAccountId",
                 dr.reviewed_at AS "reviewedAt", dr.review_decision_notes AS "reviewDecisionNotes",
                 dr.receipt_id AS "receiptId", a1.display_name AS "proposerName", a2.display_name AS "approverName"
          FROM deletion_requests dr
          JOIN accounts a1 ON a1.id = dr.proposer_account_id
          LEFT JOIN accounts a2 ON a2.id = dr.approver_account_id
          ORDER BY dr.proposed_at DESC
        `;
      }

      const result = await db().execute(query);
      return res.json({ success: true, data: { items: result.rows } });
    } catch (err) {
      return next(err);
    }
  });

  // GET /deletion/proposals/:id - View single proposal
  router.get('/deletion/proposals/:id', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db().execute(sql`
        SELECT dr.id, dr.record_class AS "recordClass", dr.target_type AS "targetType",
               dr.target_id AS "targetId", dr.reason, dr.proposer_account_id AS "proposerAccountId",
               dr.proposed_at AS "proposedAt", dr.status, dr.approver_account_id AS "approverAccountId",
               dr.reviewed_at AS "reviewedAt", dr.review_decision_notes AS "reviewDecisionNotes",
               dr.receipt_id AS "receiptId", a1.display_name AS "proposerName", a2.display_name AS "approverName"
        FROM deletion_requests dr
        JOIN accounts a1 ON a1.id = dr.proposer_account_id
        LEFT JOIN accounts a2 ON a2.id = dr.approver_account_id
        WHERE dr.id = ${req.params.id}
      `);

      if (!result.rowCount) {
        return res.status(404).json({ success: false, error: 'proposal_not_found', message: 'Deletion proposal not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // POST /deletion/proposals/:id/approve - Two-person approval and defensible execution
  router.post('/deletion/proposals/:id/approve', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposalRes = await db().execute(sql`
        SELECT dr.id, dr.record_class AS "recordClass", dr.target_type AS "targetType",
               dr.target_id AS "targetId", dr.reason, dr.proposer_account_id AS "proposerAccountId",
               dr.status, rp.legal_basis AS "legalBasis"
        FROM deletion_requests dr
        JOIN retention_policies rp ON rp.record_class = dr.record_class
        WHERE dr.id = ${req.params.id}
      `);

      if (!proposalRes.rowCount) {
        return res.status(404).json({ success: false, error: 'proposal_not_found', message: 'Deletion proposal not found' });
      }

      const proposal = proposalRes.rows[0] as any;

      if (proposal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'invalid_proposal_status',
          message: `Cannot approve proposal with status '${proposal.status}'`,
        });
      }

      // CRITICAL: Two-Person Rule Enforcement
      // The approver MUST NOT be the same actor who proposed the deletion!
      if (proposal.proposerAccountId === req.account!.id) {
        return res.status(403).json({
          success: false,
          error: 'self_approval_forbidden',
          message: 'Two-person rule violation: Deletion cannot be approved by the same person who proposed it. A distinct second authorized approver is required.',
        });
      }

      // CRITICAL: Recheck Legal Holds at Execution Time
      const holdCheck = await checkActiveLegalHold(db(), proposal.targetType, proposal.targetId, proposal.recordClass);
      if (holdCheck.active) {
        await db().execute(sql`
          UPDATE deletion_requests
          SET status = 'blocked_hold',
              updated_at = now()
          WHERE id = ${proposal.id}
        `);

        await db().execute(sql`
          INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
          VALUES (${req.account!.id}, 'deletion_blocked_by_hold', ${proposal.targetId}, 'retention',
                  ${JSON.stringify({ proposalId: proposal.id, holdReference: holdCheck.hold?.reference })})
        `);

        return res.status(409).json({
          success: false,
          error: 'record_under_legal_hold',
          message: `Deletion execution blocked: target is protected under active legal hold '${holdCheck.hold?.reference}'`,
          hold: holdCheck.hold,
        });
      }

      // Execute defensible deletion
      const { manifest } = await executeDefensibleDeletion(db(), proposal.targetType, proposal.targetId, proposal.recordClass);

      // Generate Receipt
      const receiptId = crypto.randomUUID();
      const deletedAt = new Date().toISOString();

      const verificationHash = computeDeletionVerificationHash({
        id: receiptId,
        deletionRequestId: proposal.id,
        recordClass: proposal.recordClass,
        targetType: proposal.targetType,
        targetId: proposal.targetId,
        proposerAccountId: proposal.proposerAccountId,
        approverAccountId: req.account!.id,
        deletedAt,
        manifest,
      });

      const receiptRes = await db().execute(sql`
        INSERT INTO deletion_receipts(id, deletion_request_id, record_class, target_type, target_id,
                                      proposer_account_id, approver_account_id, reason, legal_basis,
                                      manifest, verification_hash, deleted_at)
        VALUES (${receiptId}, ${proposal.id}, ${proposal.recordClass}, ${proposal.targetType}, ${proposal.targetId},
                ${proposal.proposerAccountId}, ${req.account!.id}, ${proposal.reason}, ${proposal.legalBasis},
                ${JSON.stringify(manifest)}, ${verificationHash}, ${deletedAt})
        RETURNING id, deletion_request_id AS "deletionRequestId", record_class AS "recordClass",
                  target_type AS "targetType", target_id AS "targetId",
                  proposer_account_id AS "proposerAccountId", approver_account_id AS "approverAccountId",
                  reason, legal_basis AS "legalBasis", manifest, verification_hash AS "verificationHash",
                  deleted_at AS "deletedAt"
      `);

      // Update deletion request
      const updatedProposal = await db().execute(sql`
        UPDATE deletion_requests
        SET status = 'executed',
            approver_account_id = ${req.account!.id},
            reviewed_at = now(),
            receipt_id = ${receiptId},
            updated_at = now()
        WHERE id = ${proposal.id}
        RETURNING id, record_class AS "recordClass", target_type AS "targetType", target_id AS "targetId",
                  status, approver_account_id AS "approverAccountId", reviewed_at AS "reviewedAt", receipt_id AS "receiptId"
      `);

      // Record Audit Event
      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${req.account!.id}, 'deletion_executed', ${proposal.targetId}, 'retention',
                ${JSON.stringify({ proposalId: proposal.id, receiptId, targetType: proposal.targetType, recordClass: proposal.recordClass, verificationHash })})
      `);

      return res.status(200).json({
        success: true,
        data: {
          proposal: updatedProposal.rows[0],
          receipt: receiptRes.rows[0],
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // POST /deletion/proposals/:id/reject - Reject deletion proposal
  router.post('/deletion/proposals/:id/reject', requireSession, requireSameOrigin, requireRole('hospital_admin', 'superadmin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notes } = req.body || {};

      const check = await db().execute(sql`
        SELECT id, status FROM deletion_requests WHERE id = ${req.params.id}
      `);
      if (!check.rowCount) {
        return res.status(404).json({ success: false, error: 'proposal_not_found', message: 'Deletion proposal not found' });
      }
      if ((check.rows[0] as any).status !== 'pending') {
        return res.status(400).json({ success: false, error: 'invalid_status', message: 'Only pending proposals can be rejected' });
      }

      const updated = await db().execute(sql`
        UPDATE deletion_requests
        SET status = 'rejected',
            approver_account_id = ${req.account!.id},
            reviewed_at = now(),
            review_decision_notes = ${notes || 'Rejected during administrative review'},
            updated_at = now()
        WHERE id = ${req.params.id}
        RETURNING id, status, approver_account_id AS "approverAccountId", reviewed_at AS "reviewedAt", review_decision_notes AS "reviewDecisionNotes"
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${req.account!.id}, 'deletion_rejected', ${req.params.id}, 'retention',
                ${JSON.stringify({ proposalId: req.params.id, notes: notes || 'Rejected during administrative review' })})
      `);

      return res.json({ success: true, data: updated.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // GET /deletion/receipts/:id - Retrieve and verify immutable deletion receipt
  router.get('/deletion/receipts/:id', requireSession, requireRole('hospital_admin', 'superadmin', 'coordinator'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db().execute(sql`
        SELECT dr.id, dr.deletion_request_id AS "deletionRequestId", dr.record_class AS "recordClass",
               dr.target_type AS "targetType", dr.target_id AS "targetId",
               dr.proposer_account_id AS "proposerAccountId", dr.approver_account_id AS "approverAccountId",
               dr.reason, dr.legal_basis AS "legalBasis", dr.manifest,
               dr.verification_hash AS "verificationHash", dr.deleted_at AS "deletedAt",
               a1.display_name AS "proposerName", a2.display_name AS "approverName"
        FROM deletion_receipts dr
        JOIN accounts a1 ON a1.id = dr.proposer_account_id
        JOIN accounts a2 ON a2.id = dr.approver_account_id
        WHERE dr.id = ${req.params.id}
      `);

      if (!result.rowCount) {
        return res.status(404).json({ success: false, error: 'receipt_not_found', message: 'Deletion receipt not found' });
      }

      const receipt = result.rows[0] as any;

      // Verify cryptographic hash integrity
      const expectedHash = computeDeletionVerificationHash({
        id: receipt.id,
        deletionRequestId: receipt.deletionRequestId,
        recordClass: receipt.recordClass,
        targetType: receipt.targetType,
        targetId: receipt.targetId,
        proposerAccountId: receipt.proposerAccountId,
        approverAccountId: receipt.approverAccountId,
        deletedAt: new Date(receipt.deletedAt).toISOString(),
        manifest: receipt.manifest,
      });

      const hashValid = receipt.verificationHash === expectedHash;

      return res.json({
        success: true,
        data: {
          ...receipt,
          hashVerified: hashValid,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createRetentionRouter;
