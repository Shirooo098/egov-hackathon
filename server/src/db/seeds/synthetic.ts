import "dotenv/config";
import { Pool, type PoolClient } from "pg";
import { isLiveMode } from "../../runtime/config.js";
import { provisionMfa } from "../../auth/staff.js";
import type { RuntimeMode } from "../../runtime/config.js";

export class SeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedError";
  }
}
export const STAFF_ROLES = [
  "coordinator",
  "doctor",
  "clinical_lead",
  "hospital_admin",
  "scheduler",
  "supervisor",
  "blood_approver",
] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
type StaffSeed = { username: string; password: string; totpSeed: string };

export function parseSyntheticStaffSeed(
  raw = process.env.SYNTHETIC_STAFF_SEED_JSON,
): Record<StaffRole, StaffSeed> | null {
  if (!raw?.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SeedError("SYNTHETIC_STAFF_SEED_JSON must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new SeedError(
      "SYNTHETIC_STAFF_SEED_JSON must be an object keyed by role",
    );
  const value = parsed as Record<string, unknown>;
  if (
    Object.keys(value).length !== STAFF_ROLES.length ||
    STAFF_ROLES.some((role) => !(role in value))
  )
    throw new SeedError(
      "SYNTHETIC_STAFF_SEED_JSON must contain exactly one entry per Staff role",
    );
  const result = {} as Record<StaffRole, StaffSeed>;
  for (const role of STAFF_ROLES) {
    const item = value[role];
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new SeedError(`Invalid synthetic Staff seed for ${role}`);
    const entry = item as Record<string, unknown>;
    if (
      Object.keys(entry).some(
        (key) => !["username", "password", "totpSeed"].includes(key),
      ) ||
      typeof entry.username !== "string" ||
      typeof entry.password !== "string" ||
      typeof entry.totpSeed !== "string"
    )
      throw new SeedError(`Invalid synthetic Staff seed for ${role}`);
    const totpSeed = entry.totpSeed.toUpperCase();
    if (
      !/^[A-Z2-7]{16,64}$/.test(totpSeed) ||
      entry.password.length < 14 ||
      entry.password.length > 128 ||
      !entry.username.trim() ||
      entry.username.length > 320
    )
      throw new SeedError(`Invalid synthetic Staff seed for ${role}`);
    result[role] = {
      username: entry.username,
      password: entry.password,
      totpSeed,
    };
  }
  if (
    new Set(Object.values(result).map(({ username }) => username.toLowerCase()))
      .size !== STAFF_ROLES.length
  )
    throw new SeedError("Synthetic Staff usernames must be unique");
  return result;
}

async function ensureRoleConstraint(c: PoolClient) {
  await c.query(
    "ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_role_check",
  );
  await c.query(
    "ALTER TABLE accounts ADD CONSTRAINT accounts_role_check CHECK (role IN ('citizen','coordinator','doctor','clinical_lead','hospital_admin','scheduler','supervisor','blood_approver'))",
  );
  await c.query(
    "ALTER TABLE clinical_reviews ALTER COLUMN episode_id DROP NOT NULL",
  );
}

async function seedStaff(
  c: PoolClient,
  hospitalId: string,
  supplied: Record<StaffRole, StaffSeed> | null,
) {
  const ids = {} as Record<StaffRole, string>;
  for (const role of STAFF_ROLES) {
    const seed = supplied?.[role];
    const username =
      seed?.username ?? `synthetic-demo-${role.replaceAll("_", "-")}`;
    const scope = role === "blood_approver" ? ["blood"] : ["blood", "kidney"];
    const account = (
      await c.query(
        `INSERT INTO accounts(login_identity,display_name,role,hospital_id,service_scope,status) VALUES ($1,$2,$3,$4,$5,'active')
      ON CONFLICT (login_identity) DO UPDATE SET display_name=EXCLUDED.display_name,role=EXCLUDED.role,hospital_id=EXCLUDED.hospital_id,service_scope=EXCLUDED.service_scope,status='active' RETURNING id`,
        [username, `Synthetic ${role}`, role, hospitalId, scope],
      )
    ).rows[0];
    ids[role] = account.id;
    if (
      seed &&
      !(
        await c.query(
          "SELECT account_id FROM staff_credentials WHERE account_id=$1",
          [account.id],
        )
      ).rowCount
    )
      await provisionMfa(
        account.id,
        seed.username,
        seed.password,
        c,
        seed.totpSeed,
      );
  }
  return ids;
}

async function seedBaseline(c: PoolClient, generation = "base") {
  await ensureRoleConstraint(c);
  const hospital = (
    await c.query(`INSERT INTO hospitals(name,namespace,synthetic) VALUES ('eBuhay Simulated Hospital','ebuhay-simulated-hospital',true)
    ON CONFLICT(namespace) DO UPDATE SET name=EXCLUDED.name,synthetic=true RETURNING id`)
  ).rows[0];
  const services = (
    await c.query(
      `INSERT INTO services(hospital_id,code,name) VALUES ($1,'blood','Simulated Blood Donation Service'),($1,'kidney','Synthetic Transplant Service')
    ON CONFLICT(hospital_id,code) DO UPDATE SET name=EXCLUDED.name RETURNING code,id`,
      [hospital.id],
    )
  ).rows;
  const service = Object.fromEntries(
    services.map((row: any) => [row.code, row.id]),
  ) as { blood: string; kidney: string };
  const staff = await seedStaff(c, hospital.id, parseSyntheticStaffSeed());
  const actor = staff.hospital_admin;
  const citizen = (
    await c.query(
      `INSERT INTO accounts(login_identity,display_name,role) VALUES ('synthetic-demo-recipient','Synthetic Demo Recipient','citizen') ON CONFLICT(login_identity) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,
    )
  ).rows[0].id;
  const caseId = (
    await c.query(
      `INSERT INTO citizen_cases(account_id,hospital_id,service_id,role,status) VALUES ($1,$2,$3,'recipient','active') RETURNING id`,
      [citizen, hospital.id, service.kidney],
    )
  ).rows[0].id;
  const episodeId = (
    await c.query(
      `INSERT INTO episodes(case_id,lifecycle,participation) VALUES ($1,'created','active') RETURNING id`,
      [caseId],
    )
  ).rows[0].id;
  await c.query(
    `INSERT INTO recipient_intakes(episode_id,request_type,declared_blood_group,requested_organ,urgency,state) VALUES ($1,'organ','A+','kidney','urgent','active') ON CONFLICT(episode_id) DO NOTHING`,
    [episodeId],
  );
  const donor = (
    await c.query(
      `INSERT INTO accounts(login_identity,display_name,role) VALUES ('synthetic-demo-donor','Synthetic Demo Donor','citizen') ON CONFLICT(login_identity) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,
    )
  ).rows[0].id;
  const donorCase = (
    await c.query(
      `INSERT INTO citizen_cases(account_id,hospital_id,service_id,role,status) VALUES ($1,$2,$3,'donor','active') RETURNING id`,
      [donor, hospital.id, service.kidney],
    )
  ).rows[0].id;
  const donorEpisode = (
    await c.query(
      `INSERT INTO episodes(case_id,lifecycle,participation) VALUES ($1,'created','active') RETURNING id`,
      [donorCase],
    )
  ).rows[0].id;
  await c.query(
    `INSERT INTO donor_intakes(episode_id,declared_blood_group,pledged_organs,blood_donor,availability,state) VALUES ($1,'O+',ARRAY['kidney','liver'],true,'available','active') ON CONFLICT(episode_id) DO NOTHING`,
    [donorEpisode],
  );
  const coordinator = staff.coordinator;
  const doctor = staff.doctor;
  await c.query(
    `INSERT INTO pair_reviewer_grants(account_id,hospital_id,service_id,granted_by) VALUES ($1,$2,$3,$4),($5,$2,$3,$4) ON CONFLICT(account_id,hospital_id,service_id) DO UPDATE SET revoked_at=NULL`,
    [doctor, hospital.id, service.kidney, actor, staff.clinical_lead],
  );
  await c.query(
    `INSERT INTO staff_assignments(episode_id,primary_staff_id,service_id) VALUES ($1,$2,$3)`,
    [episodeId, coordinator, service.kidney],
  );
  const pair =
    (
      await c.query(
        `INSERT INTO pair_proposals(own_episode_id,counterpart_episode_id,status,state,verified_by,verified_at) SELECT $1,$2,'proposed','awaiting_citizen_acceptance',$3,now() WHERE NOT EXISTS (SELECT 1 FROM pair_proposals WHERE own_episode_id=$1 AND state NOT IN ('declined','withdrawn')) RETURNING id`,
        [donorEpisode, episodeId, coordinator],
      )
    ).rows[0]?.id ||
    (
      await c.query(
        `SELECT id FROM pair_proposals WHERE own_episode_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [donorEpisode],
      )
    ).rows[0].id;
  const review =
    (
      await c.query(
        `INSERT INTO clinical_reviews(pair_id,hospital_reference,category,approved_summary,next_action,source,author_reference,occurred_at) SELECT $1,'SYN-REVIEW-001','living-donation','Synthetic review approved','Schedule coordination','synthetic-hospital','synthetic-doctor',now() WHERE NOT EXISTS (SELECT 1 FROM clinical_reviews WHERE pair_id=$1) RETURNING id`,
        [pair],
      )
    ).rows[0]?.id ||
    (
      await c.query(
        `SELECT id FROM clinical_reviews WHERE pair_id=$1 LIMIT 1`,
        [pair],
      )
    ).rows[0].id;
  await c.query(
    `INSERT INTO staff_assignments(episode_id,primary_staff_id,service_id,review_id) SELECT NULL,$1,$2,$3 WHERE NOT EXISTS (SELECT 1 FROM staff_assignments WHERE review_id=$3)`,
    [doctor, service.kidney, review],
  );
  await c.query(
    `INSERT INTO pair_consents(pair_id,episode_id,actor_account_id,consent_version,consent_hash,action,idempotency_key)
    VALUES ($1,$2,$3,'v1.0','synthetic-consent-donor','grant',$4),($1,$5,$6,'v1.0','synthetic-consent-recipient','grant',$7)
    ON CONFLICT (actor_account_id, idempotency_key) DO NOTHING`,
    [
      pair,
      donorEpisode,
      donor,
      `synthetic-consent-donor-${generation}`,
      episodeId,
      citizen,
      `synthetic-consent-recipient-${generation}`,
    ],
  );
  const liverDonor = (
    await c.query(
      `INSERT INTO accounts(login_identity,display_name,role) VALUES ('synthetic-demo-liver-donor','Synthetic Liver Donor','citizen') ON CONFLICT(login_identity) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,
    )
  ).rows[0].id;
  const liverRecipient = (
    await c.query(
      `INSERT INTO accounts(login_identity,display_name,role) VALUES ('synthetic-demo-liver-recipient','Synthetic Liver Recipient','citizen') ON CONFLICT(login_identity) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,
    )
  ).rows[0].id;
  const liverDonorCase = (
    await c.query(
      `INSERT INTO citizen_cases(account_id,hospital_id,service_id,role) VALUES ($1,$2,$3,'donor') RETURNING id`,
      [liverDonor, hospital.id, service.kidney],
    )
  ).rows[0].id;
  const liverRecipientCase = (
    await c.query(
      `INSERT INTO citizen_cases(account_id,hospital_id,service_id,role) VALUES ($1,$2,$3,'recipient') RETURNING id`,
      [liverRecipient, hospital.id, service.kidney],
    )
  ).rows[0].id;
  const liverDonorEpisode = (
    await c.query(`INSERT INTO episodes(case_id) VALUES ($1) RETURNING id`, [
      liverDonorCase,
    ])
  ).rows[0].id;
  const liverRecipientEpisode = (
    await c.query(`INSERT INTO episodes(case_id) VALUES ($1) RETURNING id`, [
      liverRecipientCase,
    ])
  ).rows[0].id;
  await c.query(
    `INSERT INTO donor_intakes(episode_id,declared_blood_group,pledged_organs,availability,state) VALUES ($1,'O+',ARRAY['liver'],'available','active')`,
    [liverDonorEpisode],
  );
  await c.query(
    `INSERT INTO recipient_intakes(episode_id,request_type,declared_blood_group,requested_organ,urgency,state) VALUES ($1,'organ','A+','liver','urgent','active')`,
    [liverRecipientEpisode],
  );
  const liverPair = (
    await c.query(
      `INSERT INTO pair_proposals(own_episode_id,counterpart_episode_id,status,state,verified_by) VALUES ($1,$2,'proposed','awaiting_citizen_acceptance',$3) RETURNING id`,
      [liverDonorEpisode, liverRecipientEpisode, coordinator],
    )
  ).rows[0].id;
  await c.query(
    `INSERT INTO pair_consents(pair_id,episode_id,actor_account_id,consent_hash,idempotency_key)
    VALUES ($1,$2,$3,'synthetic-liver-donor',$4),($1,$5,$6,'synthetic-liver-recipient',$7)
    ON CONFLICT (actor_account_id, idempotency_key) DO NOTHING`,
    [
      liverPair,
      liverDonorEpisode,
      liverDonor,
      `synthetic-liver-donor-${generation}`,
      liverRecipientEpisode,
      liverRecipient,
      `synthetic-liver-recipient-${generation}`,
    ],
  );
  await c.query(
    `INSERT INTO staff_assignments(episode_id,primary_staff_id,service_id) VALUES ($1,$2,$3)`,
    [liverRecipientEpisode, coordinator, service.kidney],
  );
  const rejectedAppointment = (
    await c.query(
      `INSERT INTO appointment_requests(episode_id,preferred_dates,status,actor_account_id,idempotency_key,response_source,response_author_reference,responded_at,hospital_response_reference)
    VALUES ($1,'{}','hospital_declined',$2,$3,'synthetic-hospital','synthetic-scheduler',now(),$4) RETURNING id`,
      [
        liverRecipientEpisode,
        coordinator,
        `synthetic-rejected-appointment-${generation}`,
        `SYN-REJECT-001-${generation}`,
      ],
    )
  ).rows[0].id;
  await c.query(
    `INSERT INTO appointment_request_history(request_id,status,source,author_reference,external_reference,details,occurred_at)
    VALUES ($1,'hospital_declined','synthetic-hospital','synthetic-scheduler',$2,'{"reason":"Synthetic rejection example"}',now())`,
    [rejectedAppointment, `SYN-REJECT-001-${generation}`],
  );
  const appointment = (
    await c.query(
      `INSERT INTO appointment_requests(episode_id,slot_reference,preferred_dates,status,actor_account_id,idempotency_key,response_source,response_author_reference,responded_at,hospital_response_reference,decision_idempotency_key,decision_actor_account_id) VALUES ($1,'synthetic-slot-01','{}','hospital_confirmed',$2,$3,'synthetic-hospital','synthetic-scheduler',now(),$4,$5,$2) RETURNING id`,
      [
        episodeId,
        coordinator,
        `synthetic-appointment-request-${generation}`,
        `SYN-BOOK-001-${generation}`,
        `synthetic-appointment-decision-${generation}`,
      ],
    )
  ).rows[0].id;
  await c.query(
    `INSERT INTO bookings(request_id,slot_reference,hospital_booking_reference,status,confirmed_at) VALUES ($1,'synthetic-slot-01',$2,'confirmed',now())`,
    [appointment, `SYN-BOOK-001-${generation}`],
  );
  const donorAppointment = (
    await c.query(
      `INSERT INTO appointment_requests(episode_id,slot_reference,preferred_dates,status,actor_account_id,idempotency_key) VALUES ($1,'synthetic-slot-01','{}','request_pending',$2,$3) RETURNING id`,
      [donorEpisode, coordinator, `synthetic-blood-appointment-${generation}`],
    )
  ).rows[0].id;
  const conflictReference = `SYN-CONFLICT-001-${generation}`;
  const task = (
    await c.query(
      `INSERT INTO follow_up_tasks(episode_id,cause,assigned_team,status,conflict_reference) VALUES ($1,'synthetic-conflict','coordination','pending',$2) RETURNING id`,
      [episodeId, conflictReference],
    )
  ).rows[0]?.id;
  if (task)
    await c.query(
      `INSERT INTO reconciliation_events(target_reference,conflicting_references,resolver_id,decision,authoritative_evidence,resolved_at,reason,follow_up_task_id) VALUES ($1,'["SYN-HOSPITAL-A","SYN-HOSPITAL-B"]',$2,'resolved','SYN-HOSPITAL-A',now(),'Synthetic reconciliation baseline',$3)`,
      [conflictReference, coordinator, task],
    );
  const kidneyOffer = (
    await c.query(
      `INSERT INTO deceased_offers(recipient_episode_id,external_reference,source_deadline,status) VALUES ($1,$2,now()+interval '1 day','received') RETURNING id`,
      [episodeId, `synthetic-offer-kidney-${generation}`],
    )
  ).rows[0].id;
  const offerReview = (
    await c.query(
      `INSERT INTO clinical_reviews(offer_id,hospital_reference,category,approved_summary,next_action,source,author_reference,occurred_at)
    VALUES ($1,$2,'deceased-offer','Synthetic coordination review approved','Acknowledge simulated offer','synthetic-hospital',$3,now()) RETURNING id`,
      [kidneyOffer, `SYN-OFFER-REVIEW-${generation}`, doctor],
    )
  ).rows[0].id;
  await c.query(
    `INSERT INTO staff_assignments(episode_id,primary_staff_id,service_id,review_id) VALUES (NULL,$1,$2,$3)`,
    [doctor, service.kidney, offerReview],
  );
  for (const [i, organ] of ["liver", "heart", "lung", "pancreas"].entries()) {
    const account = (
      await c.query(
        `INSERT INTO accounts(login_identity,display_name,role) VALUES ($1,$2,'citizen') ON CONFLICT(login_identity) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`,
        [
          `synthetic-demo-recipient-${organ}`,
          `Synthetic Demo ${organ} Recipient`,
        ],
      )
    ).rows[0].id;
    const caseId = (
      await c.query(
        `INSERT INTO citizen_cases(account_id,hospital_id,service_id,role,status) VALUES ($1,$2,$3,'recipient','active') RETURNING id`,
        [account, hospital.id, service.kidney],
      )
    ).rows[0].id;
    const organEpisode = (
      await c.query(
        `INSERT INTO episodes(case_id,lifecycle,participation) VALUES ($1,'created','active') RETURNING id`,
        [caseId],
      )
    ).rows[0].id;
    await c.query(
      `INSERT INTO recipient_intakes(episode_id,request_type,declared_blood_group,requested_organ,urgency,state) VALUES ($1,'organ','A+',$2,'urgent','active')`,
      [organEpisode, organ],
    );
    await c.query(
      `INSERT INTO deceased_offers(recipient_episode_id,external_reference,source_deadline,status) VALUES ($1,$2,now()+(($3)::text||' days')::interval,'received')`,
      [organEpisode, `synthetic-offer-${organ}-${generation}`, i + 2],
    );
  }
  await c.query(
    `INSERT INTO hospital_slots(hospital_id,service_id,slot_reference,starts_at,ends_at) VALUES ($1,$2,'synthetic-slot-01',now()+interval '1 day',now()+interval '1 day 1 hour')
    ON CONFLICT(hospital_id,slot_reference) DO UPDATE SET service_id=EXCLUDED.service_id,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,status='published',updated_at=now()`,
    [hospital.id, service.kidney],
  );
  for (const status of ['draft', 'approved', 'published', 'closed']) {
    const blood = (
      await c.query(
        `INSERT INTO blood_requests(hospital_id,service_id,public_text,status,creator_id,approver_id,approval_reference,approved_at,published_at,closed_at,source) VALUES ($1,$2,$3,$4,$5,$5,CASE WHEN $4 IN ('approved','published','closed') THEN $3 ELSE NULL END,CASE WHEN $4 IN ('approved','published','closed') THEN now() ELSE NULL END,CASE WHEN $4 IN ('published','closed') THEN now() ELSE NULL END,CASE WHEN $4='closed' THEN now() ELSE NULL END,'synthetic-seed') RETURNING id`,
        [
          hospital.id,
          service.blood,
          `Synthetic O+ blood request ${status} ${generation}`,
          status,
          actor,
        ],
      )
    ).rows[0].id;
    await c.query(
      `INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES ($1,$2,$3,'synthetic-seed',$4)`,
      [
        actor,
        `blood_request_${status}`,
        blood,
        JSON.stringify({ generation, status }),
      ],
    );
    if (status === "published")
      await c.query(
        `INSERT INTO blood_responses(blood_request_id,donor_episode_id,appointment_request_id,actor_account_id,idempotency_key,response_hash)
      VALUES ($1,$2,$3,$4,$5,digest($5,'sha256'))`,
        [
          blood,
          donorEpisode,
          donorAppointment,
          donor,
          `synthetic-blood-response-${generation}`,
        ],
      );
  }
  const withdrawnCase = (
    await c.query(
      `INSERT INTO citizen_cases(account_id,hospital_id,service_id,role,status) VALUES ($1,$2,$3,'recipient','withdrawn') RETURNING id`,
      [citizen, hospital.id, service.kidney],
    )
  ).rows[0].id;
  await c.query(
    `INSERT INTO episodes(case_id,lifecycle,participation,withdrawal_reason) VALUES ($1,'withdrawn','withdrawn','Synthetic historical withdrawal')`,
    [withdrawnCase],
  );
  return {
    hospitalId: hospital.id as string,
    serviceIds: services.map((row: any) => row.id as string),
  };
}

export async function seedSyntheticData(
  targetPool?: Pool,
): Promise<{ hospitalId: string; serviceIds: string[] }> {
  const mode = (process.env.EBUHAY_MODE || "synthetic") as RuntimeMode;
  if (isLiveMode(mode) || process.env.SYNTHETIC_MODE !== "true")
    throw new SeedError(
      `Synthetic seeds are strictly prohibited in live mode (EBUHAY_MODE=${mode})`,
    );
  const pool =
    targetPool ||
    new Pool({
      connectionString:
        process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL,
    });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hosp = (
      await client.query(
        "SELECT id FROM hospitals WHERE namespace='ebuhay-simulated-hospital' AND synthetic=true",
      )
    ).rows[0];
    if (hosp) {
      await client.query(
        "UPDATE episodes e SET lifecycle='retired',participation='withdrawn',updated_at=now() FROM citizen_cases c WHERE c.id=e.case_id AND c.hospital_id=$1 AND e.lifecycle NOT IN ('retired','withdrawn')",
        [hosp.id],
      );
      await client.query(
        "UPDATE citizen_cases SET status='retired',updated_at=now() WHERE hospital_id=$1 AND status='active'",
        [hosp.id],
      );
      await client.query(
        "UPDATE bookings SET status='cancelled',updated_at=now() WHERE request_id IN (SELECT ar.id FROM appointment_requests ar JOIN episodes e ON e.id=ar.episode_id JOIN citizen_cases c ON c.id=e.case_id WHERE c.hospital_id=$1) AND status='confirmed'",
        [hosp.id],
      );
    }
    const count =
      (
        await client.query(
          "SELECT count(*)::int AS count FROM citizen_cases WHERE hospital_id=(SELECT id FROM hospitals WHERE namespace='ebuhay-simulated-hospital')",
        )
      ).rows[0]?.count || 0;
    const result = await seedBaseline(client, `seed-${Number(count) + 1}`);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    if (!targetPool) await pool.end();
  }
}

export async function resetSyntheticData(
  targetPool: Pool,
  actorAccountId: string,
) {
  const client = await targetPool.connect();
  try {
    await client.query("BEGIN");
    const actorHospital = (
      await client.query(
        "SELECT h.id FROM hospitals h JOIN accounts a ON a.hospital_id=h.id WHERE a.id=$1 AND h.synthetic=true FOR UPDATE",
        [actorAccountId],
      )
    ).rows[0];
    const hospital =
      actorHospital &&
      (
        await client.query(
          "SELECT id FROM hospitals WHERE namespace='ebuhay-simulated-hospital' AND synthetic=true FOR UPDATE",
        )
      ).rows[0];
    if (!hospital || !actorHospital || actorHospital.id !== hospital.id)
      throw new SeedError(
        "Reset actor must belong to the canonical synthetic hospital",
      );
    await client.query(
      "UPDATE episodes e SET lifecycle='retired',participation='withdrawn',updated_at=now() FROM citizen_cases c WHERE c.id=e.case_id AND c.hospital_id=$1 AND e.lifecycle NOT IN ('retired','withdrawn')",
      [hospital.id],
    );
    await client.query(
      "UPDATE citizen_cases SET status='retired',updated_at=now() WHERE hospital_id=$1 AND status='active'",
      [hospital.id],
    );
    await client.query(
      "UPDATE blood_requests SET status='closed',updated_at=now() WHERE hospital_id=$1 AND status <> 'closed'",
      [hospital.id],
    );
    await client.query(
      "UPDATE pair_proposals SET state='withdrawn',status='withdrawn',updated_at=now() WHERE own_episode_id IN (SELECT e.id FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE c.hospital_id=$1) AND state NOT IN ('declined','withdrawn')",
      [hospital.id],
    );
    await client.query(
      "UPDATE deceased_offers SET status='retired',updated_at=now() WHERE recipient_episode_id IN (SELECT e.id FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE c.hospital_id=$1) AND status <> 'retired'",
      [hospital.id],
    );
    await client.query(
      "UPDATE appointment_requests SET status='cancelled',updated_at=now() WHERE episode_id IN (SELECT e.id FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE c.hospital_id=$1) AND status NOT IN ('cancelled','rejected')",
      [hospital.id],
    );
    await client.query(
      "UPDATE bookings SET status='cancelled',updated_at=now() WHERE request_id IN (SELECT ar.id FROM appointment_requests ar JOIN episodes e ON e.id=ar.episode_id JOIN citizen_cases c ON c.id=e.case_id WHERE c.hospital_id=$1) AND status='confirmed'",
      [hospital.id],
    );
    const generation = String(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM citizen_cases WHERE hospital_id=$1",
          [hospital.id],
        )
      ).rows[0].count + 1,
    );
    const result = await seedBaseline(client, `reset-${generation}`);
    await client.query(
      `INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES ($1,'operations.synthetic_reset',$2,'synthetic-console',$3)`,
      [
        actorAccountId,
        hospital.id,
        JSON.stringify({ serviceIds: result.serviceIds }),
      ],
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith("synthetic.ts"))
  seedSyntheticData()
    .then((result) => {
      console.log("Synthetic seed completed:", {
        hospitalId: result.hospitalId,
        serviceIds: result.serviceIds,
      });
    })
    .catch((error) => {
      console.error(
        "Synthetic seed failed:",
        error instanceof Error ? error.message : "seed failed",
      );
      process.exitCode = 1;
    });
