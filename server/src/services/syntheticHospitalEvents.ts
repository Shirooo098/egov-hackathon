import crypto from "node:crypto";

export const SCHEMA_VERSION = "synthetic-hospital-event.v1";
export const EVENT_TYPES = new Set([
  "appointment.request-status",
  "booking.confirmed",
  "booking.cancelled",
  "case.linkage-status",
  "blood.request-closed",
  "deceased-offer.received",
  "deceased-offer.acknowledged",
  "deceased-offer.responded",
]);
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
export const NONCE = /^[A-Za-z0-9_-]{22,128}$/;
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type Envelope = {
  sourceId: string;
  hospitalId: string;
  eventId: string;
  eventType: string;
  schemaVersion: string;
  issuedAt: string;
  observedAt: string;
  nonce: string;
  sequence: number;
  targetReference: string;
  payloadHash: string;
  payload: Record<string, Json>;
  signature: string;
};
export type SyntheticEnvelopeInput = Omit<
  Envelope,
  "payloadHash" | "signature"
>;

export function canonicalJson(value: Json): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid JSON number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}
const signingContent = (e: Omit<Envelope, "payload" | "signature">): Json => ({
  eventId: e.eventId,
  eventType: e.eventType,
  hospitalId: e.hospitalId,
  issuedAt: e.issuedAt,
  nonce: e.nonce,
  observedAt: e.observedAt,
  payloadHash: e.payloadHash,
  schemaVersion: e.schemaVersion,
  sequence: e.sequence,
  sourceId: e.sourceId,
  targetReference: e.targetReference,
});
const hmac = (secret: string, content: Json) =>
  crypto.createHmac("sha256", secret).update(canonicalJson(content)).digest();
const exactObject = (
  value: unknown,
  allowed: Set<string>,
): value is Record<string, Json> =>
  Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowed.has(key)),
  );
export function validPayload(
  eventType: string,
  value: unknown,
): value is Record<string, Json> {
  if (eventType === "appointment.request-status")
    return (
      exactObject(value, new Set(["status", "hospitalReference"])) &&
      ["accepted", "declined"].includes(String(value.status)) &&
      SAFE_ID.test(String(value.hospitalReference ?? ""))
    );
  if (eventType === "booking.confirmed")
    return (
      exactObject(
        value,
        new Set(["slotReference", "hospitalBookingReference"]),
      ) &&
      SAFE_ID.test(String(value.slotReference ?? "")) &&
      SAFE_ID.test(String(value.hospitalBookingReference ?? ""))
    );
  if (eventType === "booking.cancelled")
    return (
      exactObject(value, new Set(["hospitalBookingReference", "reasonCode"])) &&
      SAFE_ID.test(String(value.hospitalBookingReference ?? "")) &&
      (value.reasonCode === undefined || SAFE_ID.test(String(value.reasonCode)))
    );
  if (eventType === "case.linkage-status")
    return (
      exactObject(value, new Set(["state", "hospitalReference"])) &&
      ["verified", "suspended"].includes(String(value.state)) &&
      SAFE_ID.test(String(value.hospitalReference ?? ""))
    );
  if (eventType === "blood.request-closed")
    return (
      exactObject(value, new Set(["hospitalReference"])) &&
      SAFE_ID.test(String(value.hospitalReference ?? ""))
    );
  if (eventType === "deceased-offer.received")
    return (
      exactObject(value, new Set(["offerReference", "deadline"])) &&
      SAFE_ID.test(String(value.offerReference ?? "")) &&
      (value.deadline === undefined ||
        Number.isFinite(new Date(String(value.deadline)).getTime()))
    );
  if (eventType === "deceased-offer.acknowledged")
    return (
      exactObject(value, new Set(["acknowledgementReference"])) &&
      SAFE_ID.test(String(value.acknowledgementReference ?? ""))
    );
  if (eventType === "deceased-offer.responded")
    return (
      exactObject(value, new Set(["responseReference", "responseStatus"])) &&
      SAFE_ID.test(String(value.responseReference ?? "")) &&
      ["accepted", "declined"].includes(String(value.responseStatus))
    );
  return false;
}
export type VerifyOptions = {
  secret: string;
  sourceId: string;
  hospitalId: string;
  now?: Date;
};
export function verifySyntheticEnvelope(
  value: unknown,
  options: VerifyOptions,
): {
  envelope: Envelope;
  payloadHash: Buffer;
  envelopeHash: Buffer;
  signatureHash: Buffer;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const keys = new Set([
    "sourceId",
    "hospitalId",
    "eventId",
    "eventType",
    "schemaVersion",
    "issuedAt",
    "observedAt",
    "nonce",
    "sequence",
    "targetReference",
    "payloadHash",
    "payload",
    "signature",
  ]);
  if (
    Object.keys(raw).length !== keys.size ||
    !Object.keys(raw).every((key) => keys.has(key))
  )
    return null;
  if (
    raw.sourceId !== options.sourceId ||
    raw.hospitalId !== options.hospitalId ||
    !UUID.test(String(raw.hospitalId)) ||
    raw.schemaVersion !== SCHEMA_VERSION ||
    !EVENT_TYPES.has(String(raw.eventType)) ||
    !SAFE_ID.test(String(raw.eventId)) ||
    !SAFE_ID.test(String(raw.targetReference)) ||
    !NONCE.test(String(raw.nonce)) ||
    !Number.isSafeInteger(raw.sequence) ||
    Number(raw.sequence) < 1 ||
    !/^[a-f0-9]{64}$/i.test(String(raw.payloadHash)) ||
    !/^[a-f0-9]{64}$/i.test(String(raw.signature))
  )
    return null;
  const issued = new Date(String(raw.issuedAt)),
    observed = new Date(String(raw.observedAt)),
    now = options.now ?? new Date();
  if (
    !Number.isFinite(issued.getTime()) ||
    !Number.isFinite(observed.getTime()) ||
    issued.toISOString() !== raw.issuedAt ||
    observed.toISOString() !== raw.observedAt ||
    Math.abs(now.getTime() - issued.getTime()) > 5 * 60_000 ||
    observed.getTime() > issued.getTime() + 5 * 60_000 ||
    issued.getTime() - observed.getTime() > 24 * 60 * 60_000
  )
    return null;
  const metadata = signingContent(
      raw as Omit<Envelope, "payload" | "signature">,
    ),
    expected = hmac(options.secret, metadata),
    supplied = Buffer.from(String(raw.signature), "hex");
  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected) ||
    !validPayload(String(raw.eventType), raw.payload)
  )
    return null;
  const payloadHash = crypto
      .createHash("sha256")
      .update(canonicalJson(raw.payload as Json))
      .digest(),
    suppliedHash = Buffer.from(String(raw.payloadHash), "hex");
  if (
    suppliedHash.length !== payloadHash.length ||
    !crypto.timingSafeEqual(suppliedHash, payloadHash)
  )
    return null;
  return {
    envelope: raw as Envelope,
    payloadHash,
    envelopeHash: crypto
      .createHash("sha256")
      .update(canonicalJson(metadata))
      .digest(),
    signatureHash: crypto.createHash("sha256").update(supplied).digest(),
  };
}
export function signSyntheticEnvelope(
  input: SyntheticEnvelopeInput,
  secret: string,
): Envelope {
  const payloadHash = crypto
    .createHash("sha256")
    .update(canonicalJson(input.payload))
    .digest("hex");
  const metadata = { ...input, payloadHash };
  return {
    ...input,
    payloadHash,
    signature: hmac(secret, signingContent(metadata)).toString("hex"),
  };
}
