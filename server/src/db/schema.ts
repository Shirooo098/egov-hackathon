import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  customType,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';
const bytea = customType({ dataType: () => "bytea" });

const id = () => uuid("id").defaultRandom().primaryKey();
const created = (col = "created_at") =>
  timestamp(col, { withTimezone: true }).defaultNow().notNull();
const updated = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

const hospitals = pgTable("hospitals", {
  id: id(),
  name: text("name").notNull(),
  namespace: text("namespace").notNull().unique(),
  synthetic: boolean("synthetic").default(true).notNull(),
  createdAt: created(),
});
const services = pgTable(
  "services",
  {
    id: id(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex("services_hospital_code_idx").on(t.hospitalId, t.code)],
);
const accounts = pgTable("accounts", {
  id: id(),
  loginIdentity: text("login_identity").notNull().unique(),
  displayName: text("display_name"),
  role: text("role").notNull(),
  serviceScope: text("service_scope").array().notNull().default([]),
  hospitalId: uuid("hospital_id").references(() => hospitals.id),
  status: text("status").default("active").notNull(),
  createdAt: created(),
  updatedAt: updated(),
});
const sessions = pgTable(
  "sessions",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: bytea("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: created(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("sessions_active_idx").on(t.tokenHash, t.expiresAt)],
);
const staffCredentials = pgTable("staff_credentials", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  username: text("username").notNull(), usernameNormalized: text("username_normalized").notNull().unique(),
  passwordSalt: bytea("password_salt").notNull(), passwordHash: bytea("password_hash").notNull(),
  mfaSecretCiphertext: bytea("mfa_secret_ciphertext"), mfaSecretIv: bytea("mfa_secret_iv"), mfaSecretAuthTag: bytea("mfa_secret_auth_tag"),
  mfaKeyVersion: integer("mfa_key_version"), lastTotpCounter: integer("last_totp_counter"),
  failedAttempts: integer("failed_attempts").default(0).notNull(), lockedUntil: timestamp("locked_until", { withTimezone: true }), disabledAt: timestamp("disabled_at", { withTimezone: true }), createdAt: created(), updatedAt: updated(),
});
const staffRecoveryCodes = pgTable("staff_recovery_codes", { id: id(), accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), codeHash: bytea("code_hash").notNull(), usedAt: timestamp("used_at", { withTimezone: true }), createdAt: created() }, (t) => [uniqueIndex("staff_recovery_codes_unique").on(t.accountId, t.codeHash), index("staff_recovery_codes_account_idx").on(t.accountId, t.usedAt)]);
const egovIdentities = pgTable("egov_identities", {
  id: id(),
  accountId: uuid("account_id").notNull().unique().references(() => accounts.id, { onDelete: "cascade" }),
  uniqid: text("uniqid").notNull().unique(),
  profile: jsonb("profile").notNull().default({}),
  createdAt: created(),
  updatedAt: updated(),
});
const egovExchangeTransactions = pgTable("egov_exchange_transactions", {
  id: id(),
  codeHash: bytea("code_hash").notNull().unique(),
  invitationId: uuid("invitation_id").references(() => invitations.id),
  uniqid: text("uniqid").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [index("egov_exchange_active_idx").on(t.codeHash, t.expiresAt)]);
const invitations = pgTable(
  "invitations",
  {
    id: id(),
    purpose: text("purpose").notNull(),
    tokenHash: bytea("token_hash").notNull().unique(),
    intendedAccountId: uuid("intended_account_id").references(
      () => accounts.id,
    ),
    intendedContact: text("intended_contact"),
    hospitalId: uuid("hospital_id").references(() => hospitals.id),
    targetReference: text("target_reference"),
    role: text("role"),
    serviceScope: text("service_scope").array().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    state: text("state").default("active").notNull(),
    intendedUniqid: text("intended_uniqid"),
    issuedByAccountId: uuid("issued_by_account_id").references(() => accounts.id),
    version: integer("version").default(1).notNull(),
    createdAt: created(),
  },
  (t) => [
    index("invitations_active_token_idx").on(t.tokenHash),
    check(
      "invitations_purpose_ck",
      sql`${t.purpose} in ('admission', 'login', 'case_claim', 'pair')`,
    ),
    check(
      "invitations_admission_ck",
      sql`(${t.purpose} = 'admission' and ${t.role} is not null and ${t.intendedAccountId} is null) or (${t.purpose} = 'login' and ${t.intendedAccountId} is not null and ${t.role} is null) or ${t.purpose} in ('case_claim', 'pair')`,
    ),
  ],
);
const admissionRequests = pgTable(
  "admission_requests",
  {
    id: id(),
    contact: text("contact").notNull(),
    status: text("status").default("pending").notNull(),
    createdAt: created(),
  },
  (t) => [
    check(
      "admission_requests_contact_check",
      sql`char_length(${t.contact}) between 3 and 320`,
    ),
    check(
      "admission_requests_status_check",
      sql`${t.status} in ('pending', 'reviewed', 'invited', 'closed')`,
    ),
    index("admission_requests_created_idx").on(t.createdAt),
    uniqueIndex("admission_requests_pending_contact_idx")
      .on(sql`lower(${t.contact})`)
      .where(sql`${t.status} = 'pending'`),
  ],
);
const citizenCases = pgTable("citizen_cases", {
  id: id(),
  accountId: uuid("account_id").references(() => accounts.id),
  hospitalId: uuid("hospital_id").references(() => hospitals.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  role: text("role").notNull(),
  participationIntent: text("participation_intent").default("evaluation").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [
  uniqueIndex("citizen_cases_active_account_service_role_idx")
    .on(t.accountId, t.serviceId, t.role)
    .where(sql`${t.accountId} is not null and ${t.status} = 'active'`),
  check("citizen_cases_intent_ck", sql`${t.participationIntent} in ('evaluation', 'blood', 'organ')`),
]);
const episodes = pgTable("episodes", {
  id: id(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => citizenCases.id),
  lifecycle: text("lifecycle").default("created").notNull(),
  participation: text("participation").default("active").notNull(),
  pauseReason: text("pause_reason"),
  withdrawalReason: text("withdrawal_reason"),
  version: integer("version").default(1).notNull(),
  createdAt: created(),
  updatedAt: updated(),
});
const egovVerificationHistory = pgTable("egov_verification_history", {
  id: id(), accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), exchangeTransactionId: uuid("exchange_transaction_id").notNull().unique().references(() => egovExchangeTransactions.id),
  uniqid: text("uniqid").notNull(), profile: jsonb("profile").notNull().default({}),
  source: text("source").notNull(), verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("egov_verification_history_account_idx").on(t.accountId, t.verifiedAt)]);
const recipientIntakes = pgTable("recipient_intakes", {
  id: id(),
  episodeId: uuid("episode_id").notNull().unique().references(() => episodes.id, { onDelete: "cascade" }),
  requestType: text("request_type").notNull(),
  declaredBloodGroup: text("declared_blood_group").notNull(),
  requestedOrgan: text("requested_organ"),
  urgency: text("urgency").notNull(),
  state: text("state").default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [
  check("recipient_intakes_request_type_ck", sql`${t.requestType} in ('blood', 'organ')`),
  check("recipient_intakes_blood_group_ck", sql`${t.declaredBloodGroup} in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')`),
  check("recipient_intakes_urgency_ck", sql`${t.urgency} in ('routine', 'urgent', 'critical')`),
  check("recipient_intakes_state_ck", sql`${t.state} in ('draft', 'active', 'paused', 'withdrawn')`),
  check("recipient_intakes_version_ck", sql`${t.version} > 0`),
  check("recipient_intakes_organ_ck", sql`(${t.requestType} = 'organ' and ${t.requestedOrgan} in ('kidney', 'liver', 'heart', 'lung', 'pancreas')) or (${t.requestType} = 'blood' and ${t.requestedOrgan} is null)`),
]);
const donorIntakes = pgTable("donor_intakes", {
  id: id(),
  episodeId: uuid("episode_id").notNull().unique().references(() => episodes.id, { onDelete: "cascade" }),
  declaredBloodGroup: text("declared_blood_group").notNull(),
  pledgedOrgans: text("pledged_organs").array().notNull().default([]),
  bloodDonor: boolean("blood_donor").default(false).notNull(),
  availability: text("availability").notNull(),
  state: text("state").default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [
  check("donor_intakes_blood_group_ck", sql`${t.declaredBloodGroup} in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')`),
  check("donor_intakes_organs_ck", sql`${t.pledgedOrgans} <@ ARRAY['kidney', 'liver', 'heart', 'lung', 'pancreas']::text[]`),
  check("donor_intakes_availability_ck", sql`${t.availability} in ('available', 'unavailable')`),
  check("donor_intakes_state_ck", sql`${t.state} in ('draft', 'active', 'paused', 'withdrawn')`),
  check("donor_intakes_version_ck", sql`${t.version} > 0`),
]);
const hospitalLinkages = pgTable("hospital_linkages", {
  id: id(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => citizenCases.id),
  episodeId: uuid("episode_id")
    .notNull()
    .references(() => episodes.id),
  hospitalReference: text("hospital_reference").notNull(),
  state: text("state").default("pending").notNull(),
  verificationMethod: text("verification_method"),
  verificationSource: text("verification_source"),
  verifierAccountId: uuid("verifier_account_id").references(() => accounts.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  version: integer("version").default(1).notNull(),
  createdAt: created(),
  updatedAt: updated(),
});
const hospitalSlots = pgTable(
  "hospital_slots",
  {
    id: id(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    slotReference: text("slot_reference").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").default("published").notNull(),
    capacity: integer("capacity").default(1).notNull(),
    createdAt: created(),
    updatedAt: updated(),
    version: integer("version").default(1).notNull(),
  },
  (t) => [
    uniqueIndex("hospital_slots_reference_idx").on(
      t.hospitalId,
      t.slotReference,
    ),
  ],
);
const caseClaims = pgTable("case_claims", {
  id: id(),
  invitationId: uuid("invitation_id")
    .notNull()
    .references(() => invitations.id),
  caseId: uuid("case_id")
    .notNull()
    .references(() => citizenCases.id),
  claimantAccountId: uuid("claimant_account_id")
    .notNull()
    .references(() => accounts.id),
  state: text("state").default("pending").notNull(),
  createdAt: created(),
  updatedAt: updated(),
});
const hospitalLinkageHistory = pgTable("hospital_linkage_history", {
  id: id(),
  linkageId: uuid("linkage_id").notNull().references(() => hospitalLinkages.id, { onDelete: "cascade" }),
  state: text("state").notNull(),
  hospitalReference: text("hospital_reference").notNull(),
  evidenceReference: text("evidence_reference"),
  method: text("method"),
  actorAccountId: uuid("actor_account_id").references(() => accounts.id),
  reason: text("reason"),
  version: integer("version").notNull(),
  createdAt: created(),
});
const pairProposals = pgTable("pair_proposals", {
  id: id(),
  ownEpisodeId: uuid("own_episode_id")
    .notNull()
    .references(() => episodes.id),
  counterpartEpisodeId: uuid("counterpart_episode_id").references(
    () => episodes.id,
  ),
  status: text("status").default("proposed").notNull(),
  state: text("state").default("awaiting_citizen_acceptance").notNull(),
  version: integer("version").default(1).notNull(),
  reviewerAccountId: uuid("reviewer_account_id").references(() => accounts.id),
  selectedBy: uuid("selected_by").references(() => accounts.id),
  selectionIdempotencyKey: text("selection_idempotency_key"),
  ownConfirmedAt: timestamp("own_confirmed_at", { withTimezone: true }),
  counterpartConfirmedAt: timestamp("counterpart_confirmed_at", {
    withTimezone: true,
  }),
  verifiedBy: uuid("verified_by").references(() => accounts.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  simulatedAnchorTx: text("simulated_anchor_tx"),
  simulatedAnchorHash: text("simulated_anchor_hash"),
  anchorStatus: text("anchor_status"),
  consentScopeVersion: integer("consent_scope_version"),
  createdAt: created(),
  updatedAt: updated(),
});
const pairResponses = pgTable("pair_responses", {
  id: id(),
  pairId: uuid("pair_id").notNull().references(() => pairProposals.id),
  episodeId: uuid("episode_id").notNull().references(() => episodes.id),
  response: text("response").notNull(),
  declineReason: text("decline_reason"),
  idempotencyKey: text("idempotency_key").notNull(),
  responseHash: bytea("response_hash"),
  createdAt: created(),
});
const pairConsents = pgTable("pair_consents", {
  id: id(),
  pairId: uuid("pair_id").notNull().references(() => pairProposals.id, { onDelete: "cascade" }),
  episodeId: uuid("episode_id").notNull().references(() => episodes.id),
  actorAccountId: uuid("actor_account_id").notNull().references(() => accounts.id),
  consentVersion: text("consent_version").default("v1.0").notNull(),
  consentHash: text("consent_hash").notNull(),
  purpose: text("purpose").default("coordination").notNull(),
  scope: text("scope").default("case").notNull(),
  evidence: text("evidence"),
  commitmentSalt: text("commitment_salt"),
  commitment: text("commitment"),
  anchorStatus: text("anchor_status").default("pending").notNull(),
  anchorTxHash: text("anchor_tx_hash"),
  anchorBlockHash: text("anchor_block_hash"),
  anchorBlockNumber: integer("anchor_block_number"),
  anchorErrorCode: text("anchor_error_code"),
  action: text("action").default("grant").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: created(),
});
const episodeConsents = pgTable("episode_consents", {
  id: id(),
  episodeId: uuid("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
  actorAccountId: uuid("actor_account_id").notNull().references(() => accounts.id),
  consentVersion: text("consent_version").default("v1.0").notNull(),
  consentHash: text("consent_hash").notNull(),
  purpose: text("purpose").default("coordination").notNull(),
  scope: text("scope").default("case").notNull(),
  evidence: text("evidence"),
  commitmentSalt: text("commitment_salt"),
  commitment: text("commitment"),
  anchorStatus: text("anchor_status").default("pending").notNull(),
  anchorTxHash: text("anchor_tx_hash"),
  anchorBlockHash: text("anchor_block_hash"),
  anchorBlockNumber: integer("anchor_block_number"),
  anchorErrorCode: text("anchor_error_code"),
  action: text("action").default("grant").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: created(),
});

const consentAnchorOutbox = pgTable("consent_anchor_outbox", {
  id: id(),
  episodeConsentId: uuid("episode_consent_id").references(() => episodeConsents.id, { onDelete: "cascade" }),
  pairConsentId: uuid("pair_consent_id").references(() => pairConsents.id, { onDelete: "cascade" }),
  commitment: text("commitment").notNull().unique(),
  status: text("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
  leasedAt: timestamp("leased_at", { withTimezone: true }),
  leaseOwner: text("lease_owner"),
  signerAddress: text("signer_address"),
  nonce: integer("nonce"),
  rawTransaction: text("raw_transaction"),
  txHash: text("tx_hash"),
  lastErrorCode: text("last_error_code"),
  createdAt: created(),
  updatedAt: updated(),
});
const staffAssignments = pgTable("staff_assignments", {
  id: id(),
  episodeId: uuid("episode_id").references(() => episodes.id),
  reviewId: uuid("review_id"),
  primaryStaffId: uuid("primary_staff_id")
    .notNull()
    .references(() => accounts.id),
  coverageStaffId: uuid("coverage_staff_id").references(() => accounts.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  version: integer("version").default(1).notNull(),
  createdAt: created(),
  updatedAt: updated(),
});
const clinicalReviews = pgTable(
  "clinical_reviews",
  {
    id: id(),
    episodeId: uuid("episode_id").references(() => episodes.id),
    pairId: uuid("pair_id").references(() => pairProposals.id),
    offerId: uuid("offer_id"),
    hospitalReference: text("hospital_reference").notNull(),
    category: text("category").notNull(),
    approvedSummary: text("approved_summary"),
    nextAction: text("next_action"),
    source: text("source").notNull(),
    authorReference: text("author_reference").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: created(),
  },
  (t) => [
    check(
      "clinical_reviews_one_target",
      sql`num_nonnulls(${t.episodeId}, ${t.pairId}, ${t.offerId}) = 1`,
    ),
  ],
);
const appointmentRequests = pgTable(
  "appointment_requests",
  {
    id: id(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id),
    reviewId: uuid("review_id").references(() => clinicalReviews.id),
    slotReference: text("slot_reference"),
    preferredDates: jsonb("preferred_dates"),
    status: text("status").default("request_pending").notNull(),
    actorAccountId: uuid("actor_account_id")
      .notNull()
      .references(() => accounts.id),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: bytea("request_hash"),
    version: integer("version").default(1).notNull(),
    responseSource: text("response_source"),
    responseAuthorReference: text("response_author_reference"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    hospitalResponseReference: text("hospital_response_reference"),
    decisionIdempotencyKey: text("decision_idempotency_key"),
    decisionActorAccountId: uuid("decision_actor_account_id").references(() => accounts.id),
    responseExternalReference: text("response_external_reference"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("appointment_requests_actor_key_idx").on(
      t.actorAccountId,
      t.idempotencyKey,
    ),
    uniqueIndex("appointment_requests_decision_key_idx").on(
      t.decisionActorAccountId,
      t.decisionIdempotencyKey,
    ),
  ],
);
const appointmentRequestHistory = pgTable("appointment_request_history", {
  id: id(),
  requestId: uuid("request_id").notNull().references(() => appointmentRequests.id),
  status: text("status").notNull(),
  source: text("source").notNull(),
  authorReference: text("author_reference").notNull(),
  externalReference: text("external_reference"),
  details: jsonb("details"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
});
const bookings = pgTable(
  "bookings",
  {
    id: id(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => appointmentRequests.id),
    slotReference: text("slot_reference").notNull(),
    hospitalBookingReference: text("hospital_booking_reference")
      .notNull()
      .unique(),
    status: text("status").default("confirmed").notNull(),
    version: integer("version").default(1).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    sourceEventId: uuid("source_event_id"),
    source: text("source"),
    sourceEventReference: text("source_event_reference"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("bookings_slot_active_idx").on(t.slotReference)],
);
const bookingChanges = pgTable(
  "booking_changes",
  {
    id: id(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => appointmentRequests.id),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    intent: text("intent").notNull(),
    preferences: jsonb("preferences"),
    status: text("status").default("change_pending").notNull(),
    actorAccountId: uuid("actor_account_id")
      .notNull()
      .references(() => accounts.id),
    idempotencyKey: text("idempotency_key").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("booking_changes_actor_key_idx").on(
      t.actorAccountId,
      t.idempotencyKey,
    ),
  ],
);
const bloodRequests = pgTable("blood_requests", {
  id: id(),
  hospitalId: uuid("hospital_id")
    .notNull()
    .references(() => hospitals.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  publicText: text("public_text").notNull(),
  status: text("status").default("draft").notNull(),
  creatorId: uuid("creator_id").notNull().references(() => accounts.id),
  approverId: uuid("approver_id").references(() => accounts.id),
  publisherId: uuid("publisher_id").references(() => accounts.id),
  closerId: uuid("closer_id").references(() => accounts.id),
  approvalReference: text("approval_reference"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  source: text("source"),
  version: integer("version").default(1).notNull(),
  createdAt: created(),
  updatedAt: updated(),
});
const bloodResponses = pgTable(
  "blood_responses",
  {
    id: id(),
    bloodRequestId: uuid("blood_request_id")
      .notNull()
      .references(() => bloodRequests.id),
    donorEpisodeId: uuid("donor_episode_id")
      .notNull()
      .references(() => episodes.id),
    appointmentRequestId: uuid("appointment_request_id")
      .references(() => appointmentRequests.id),
    actorAccountId: uuid("actor_account_id")
      .notNull()
      .references(() => accounts.id),
    idempotencyKey: text("idempotency_key").notNull(),
    responseStatus: text("response_status").default("submitted").notNull(),
    responseHash: bytea("response_hash").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("blood_responses_request_episode_idx").on(
      t.bloodRequestId,
      t.donorEpisodeId,
    ),
    uniqueIndex("blood_responses_actor_key_idx").on(
      t.actorAccountId,
      t.idempotencyKey,
    ),
  ],
);
const hospitalSourceEvents = pgTable(
  "hospital_source_events",
  {
    id: id(),
    sourceNamespace: text("source_namespace").notNull(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id),
    sourceEventId: text("source_event_id").notNull(),
    eventType: text("event_type").notNull(),
    targetReference: text("target_reference").notNull(),
    sourceVersion: integer("source_version"),
    schemaVersion: text("schema_version"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    nonce: text("nonce"),
    envelopeHash: bytea("envelope_hash"),
    signatureHash: bytea("signature_hash"),
    authorReference: text("author_reference"),
    payloadHash: bytea("payload_hash").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: created(),
    processingResult: text("processing_result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("hospital_source_events_identity_idx").on(
      t.sourceNamespace,
      t.hospitalId,
      t.sourceEventId,
    ),
    uniqueIndex("hospital_source_events_nonce_idx").on(
      t.sourceNamespace,
      t.hospitalId,
      t.nonce,
    ).where(sql`${t.schemaVersion} = 'synthetic-hospital-event.v1' and ${t.nonce} is not null`),
    uniqueIndex("hospital_source_events_sequence_idx").on(
      t.sourceNamespace,
      t.hospitalId,
      t.sourceVersion,
    ).where(sql`${t.schemaVersion} = 'synthetic-hospital-event.v1' and ${t.sourceVersion} is not null`),
  ],
);
const appointmentOutbox = pgTable(
  "appointment_outbox",
  {
    id: id(),
    appointmentRequestId: uuid("appointment_request_id").notNull().references(() => appointmentRequests.id),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    leasedAt: timestamp("leased_at", { withTimezone: true }),
    leaseOwner: text("lease_owner"),
    providerResponseReference: text("provider_response_reference"),
    lastErrorCode: text("last_error_code"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("appointment_outbox_ready_idx").on(t.status, t.availableAt, t.createdAt)],
);
const appointmentDeliveryAttempts = pgTable("appointment_delivery_attempts", {
  id: id(),
  outboxId: uuid("outbox_id").notNull().references(() => appointmentOutbox.id),
  attemptNumber: integer("attempt_number").notNull(),
  status: text("status").notNull(),
  providerResponseReference: text("provider_response_reference"),
  errorCode: text("error_code"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
});
const deceasedOffers = pgTable("deceased_offers", {
  id: id(),
  recipientEpisodeId: uuid("recipient_episode_id")
    .notNull()
    .references(() => episodes.id),
  externalReference: text("external_reference").notNull(),
  sourceDeadline: timestamp("source_deadline", { withTimezone: true }),
  status: text("status").default("received").notNull(),
  acknowledgementReference: text("acknowledgement_reference"),
  responseReference: text("response_reference"),
  responseStatus: text("response_status"),
  createdAt: created(),
  updatedAt: updated(),
});
const coordinationUpdates = pgTable("coordination_updates", {
  id: id(),
  targetReference: text("target_reference").notNull(),
  category: text("category").notNull(),
  value: jsonb("value").notNull(),
  source: text("source").notNull(),
  authorReference: text("author_reference").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: created(),
});
const conversations = pgTable("conversations", {
  id: id(),
  episodeId: uuid("episode_id")
    .references(() => episodes.id),
  pairId: uuid("pair_id").references(() => pairProposals.id),
  createdAt: created(),
});
const messages = pgTable("messages", {
  id: id(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  senderAccountId: uuid("sender_account_id")
    .notNull()
    .references(() => accounts.id),
  body: text("body").notNull(),
  visibility: text("visibility").default("team").notNull(),
  deliveryStatus: text("delivery_status").default("pending").notNull(),
  idempotencyKey: text("idempotency_key"),
  requestHash: bytea("request_hash"),
  createdAt: created(),
});
const notifications = pgTable("notifications", {
  id: id(),
  recipientAccountId: uuid("recipient_account_id")
    .notNull()
    .references(() => accounts.id),
  template: text("template").notNull(),
  safeReference: text("safe_reference"),
  channel: text("channel").notNull(),
  deliveryStatus: text("delivery_status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  providerReference: text("provider_reference"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
});
const notificationPreferences = pgTable("notification_preferences", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: 'cascade' }),
  smsConsent: boolean("sms_consent").default(false).notNull(),
  phoneNumber: text("phone_number"),
  createdAt: created(),
  updatedAt: updated(),
});
const notificationDeliveryAttempts = pgTable(
  "notification_delivery_attempts",
  {
    id: id(),
    notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: 'cascade' }),
    attemptNumber: integer("attempt_number").notNull(),
    status: text("status").notNull(),
    providerReference: text("provider_reference"),
    errorCode: text("error_code"),
    attemptedAt: created("attempted_at"),
  },
  (t) => [
    uniqueIndex("notif_delivery_attempts_idx").on(t.notificationId, t.attemptNumber),
  ],
);
const citizenProfiles = pgTable(
  "citizen_profiles",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => accounts.id, { onDelete: "cascade" }),
    encryptedPayload: bytea("encrypted_payload").notNull(),
    iv: bytea("iv").notNull(),
    authTag: bytea("auth_tag").notNull(),
    keyId: text("key_id").notNull(),
    environmentMode: text("environment_mode").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("citizen_profiles_account_idx").on(t.accountId),
    index("citizen_profiles_key_idx").on(t.keyId),
  ],
);
const privacyRequests = pgTable(
  "privacy_requests",
  {
    id: id(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    requestType: text("request_type").notNull(),
    status: text("status").default("submitted").notNull(),
    details: jsonb("details").default({}).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    rejectionReason: text("rejection_reason"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    fulfilledBy: uuid("fulfilled_by").references(() => accounts.id),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("privacy_requests_idemp_idx").on(t.accountId, t.idempotencyKey),
    index("privacy_requests_account_idx").on(t.accountId),
    index("privacy_requests_status_idx").on(t.status),
  ],
);
const privacyCorrectionHistory = pgTable(
  "privacy_correction_history",
  {
    id: id(),
    requestId: uuid("request_id").notNull().references(() => privacyRequests.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    targetRecordType: text("target_record_type").notNull(),
    targetRecordId: uuid("target_record_id"),
    fieldName: text("field_name").notNull(),
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    version: integer("version").notNull(),
    appliedBy: uuid("applied_by").notNull().references(() => accounts.id),
    appliedAt: created("applied_at"),
  },
  (t) => [
    index("privacy_corrections_account_idx").on(t.accountId),
  ],
);
const retentionPolicies = pgTable("retention_policies", {
  id: id(),
  recordClass: text("record_class").notNull().unique(),
  retentionDays: integer("retention_days").notNull(),
  legalBasis: text("legal_basis").notNull(),
  approvedBy: text("approved_by").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: created(),
  updatedAt: updated(),
});
const legalHolds = pgTable(
  "legal_holds",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    recordClass: text("record_class"),
    reason: text("reason").notNull(),
    placedBy: uuid("placed_by").notNull().references(() => accounts.id),
    placedAt: timestamp("placed_at", { withTimezone: true }).defaultNow().notNull(),
    status: text("status").default("active").notNull(),
    releasedBy: uuid("released_by").references(() => accounts.id),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    releaseReason: text("release_reason"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("legal_holds_target_idx").on(t.targetType, t.targetId, t.status),
    index("legal_holds_status_idx").on(t.status),
  ],
);
const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: id(),
    recordClass: text("record_class").notNull().references(() => retentionPolicies.recordClass),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    retentionPolicyId: uuid("retention_policy_id").references(() => retentionPolicies.id),
    proposerAccountId: uuid("proposer_account_id").notNull().references(() => accounts.id),
    proposedAt: timestamp("proposed_at", { withTimezone: true }).defaultNow().notNull(),
    status: text("status").default("pending").notNull(),
    approverAccountId: uuid("approver_account_id").references(() => accounts.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewDecisionNotes: text("review_decision_notes"),
    receiptId: uuid("receipt_id"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("deletion_requests_status_idx").on(t.status),
  ],
);
const deletionReceipts = pgTable(
  "deletion_receipts",
  {
    id: id(),
    deletionRequestId: uuid("deletion_request_id").notNull().references(() => deletionRequests.id),
    recordClass: text("record_class").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    proposerAccountId: uuid("proposer_account_id").notNull().references(() => accounts.id),
    approverAccountId: uuid("approver_account_id").notNull().references(() => accounts.id),
    reason: text("reason").notNull(),
    legalBasis: text("legal_basis").notNull(),
    manifest: jsonb("manifest").notNull(),
    verificationHash: text("verification_hash").notNull(),
    deletedAt: created("deleted_at"),
  },
  (t) => [
    index("deletion_receipts_target_idx").on(t.targetType, t.targetId),
  ],
);
const workflowKillSwitches = pgTable(
  "workflow_kill_switches",
  {
    id: id(),
    scope: text("scope").notNull(),
    hospitalId: uuid("hospital_id").references(() => hospitals.id),
    status: text("status").default("active").notNull(),
    reason: text("reason").notNull(),
    pausedBy: uuid("paused_by").notNull().references(() => accounts.id),
    pausedAt: timestamp("paused_at", { withTimezone: true }).defaultNow().notNull(),
    resumedBy: uuid("resumed_by").references(() => accounts.id),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
    resumeReason: text("resume_reason"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("workflow_kill_switches_status_idx").on(t.scope, t.hospitalId, t.status),
  ],
);
const followUpTasks = pgTable(
  "follow_up_tasks",
  {
    id: id(),
    episodeId: uuid("episode_id").references(() => episodes.id),
    bookingId: uuid("booking_id").references(() => bookings.id),
    conflictReference: text("conflict_reference"),
    assignedTeam: text("assigned_team").notNull(),
    cause: text("cause").notNull(),
    status: text("status").default("pending").notNull(),
    originatingEventId: uuid("originating_event_id").references(
      () => hospitalSourceEvents.id,
    ),
    outboxId: uuid("outbox_id").references(() => appointmentOutbox.id),
    createdAt: created(),
    updatedAt: updated(),
    version: integer("version").default(1).notNull(),
  },
  (t) => [
    uniqueIndex("follow_up_originating_event_idx").on(t.originatingEventId),
    uniqueIndex("follow_up_outbox_idx").on(t.outboxId),
  ],
);
const reconciliationEvents = pgTable("reconciliation_events", {
  id: id(),
  targetReference: text("target_reference").notNull(),
  conflictingReferences: jsonb("conflicting_references").notNull(),
  resolverId: uuid("resolver_id")
    .notNull()
    .references(() => accounts.id),
  decision: text("decision").notNull(),
  authoritativeEvidence: text("authoritative_evidence"),
  reason: text("reason"),
  sourceEventId: uuid("source_event_id").references(() => hospitalSourceEvents.id),
  followUpTaskId: uuid("follow_up_task_id").references(() => followUpTasks.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull(),
  createdAt: created(),
});
const auditEvents = pgTable("audit_events", {
  id: id(),
  actorAccountId: uuid("actor_account_id").references(() => accounts.id),
  action: text("action").notNull(),
  targetReference: text("target_reference").notNull(),
  source: text("source"),
  requestReference: text("request_reference"),
  idempotencyReference: text("idempotency_reference"),
  details: jsonb("details"),
  createdAt: created(),
});
const securityEvents = pgTable("security_events", {
  id: id(),
  actorAccountId: uuid("actor_account_id").references(() => accounts.id),
  action: text("action").notNull(),
  targetAccountId: uuid("target_account_id").references(() => accounts.id),
  details: jsonb("details"),
  createdAt: created(),
}, (t) => [index("security_events_staff_target_idx").on(t.targetAccountId, t.createdAt)]);

const continuityEvidence = pgTable("continuity_evidence", {
  id: id(),
  backupId: uuid("backup_id").notNull(),
  rehearsalType: text("rehearsal_type").notNull(),
  status: text("status").notNull(),
  targetEnvironment: text("target_environment").notNull(),
  schemaVersion: text("schema_version").notNull(),
  tablesRestored: jsonb("tables_restored").notNull(),
  recordsRestored: integer("records_restored").notNull(),
  durationMs: integer("duration_ms").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  operatorAccountId: uuid("operator_account_id").references(() => accounts.id, { onDelete: "set null" }),
  safeFallbackActive: boolean("safe_fallback_active").default(false).notNull(),
  errorDetails: text("error_details"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_continuity_evidence_backup_id").on(t.backupId),
  index("idx_continuity_evidence_status").on(t.status),
  index("idx_continuity_evidence_recorded_at").on(t.recordedAt),
]);

export {
  hospitals,
  services,
  accounts,
  sessions,
  staffCredentials,
  staffRecoveryCodes,
  egovIdentities,
  egovExchangeTransactions,
  egovVerificationHistory,
  invitations,
  admissionRequests,
  citizenCases,
  episodes,
  recipientIntakes,
  donorIntakes,
  hospitalLinkages,
  hospitalSlots,
  caseClaims,
  hospitalLinkageHistory,
  pairProposals,
  pairResponses,
  pairConsents,
  episodeConsents,
  consentAnchorOutbox,
  staffAssignments,
  clinicalReviews,
  appointmentRequests,
  appointmentRequestHistory,
  bookings,
  bookingChanges,
  bloodRequests,
  bloodResponses,
  hospitalSourceEvents,
  appointmentOutbox,
  appointmentDeliveryAttempts,
  deceasedOffers,
  coordinationUpdates,
  conversations,
  messages,
  notifications,
  notificationPreferences,
  notificationDeliveryAttempts,
  citizenProfiles,
  privacyRequests,
  privacyCorrectionHistory,
  retentionPolicies,
  legalHolds,
  deletionRequests,
  deletionReceipts,
  workflowKillSwitches,
  followUpTasks,
  reconciliationEvents,
  auditEvents,
  securityEvents,
  continuityEvidence,
};
