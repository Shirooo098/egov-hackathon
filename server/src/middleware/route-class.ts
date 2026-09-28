const KNOWN_ROUTE_PREFIXES = new Set([
  "api.v1", "api.auth", "api.egov", "api.emessage", "api.platform",
  "api.matches", "api.schedule", "api.blockchain", "api.egovai",
  "api.hospital", "api.pairs", "api.appointments", "api.conversations",
  "api.bookings", "api.blood-requests", "api.reconciliation",
  "api.profile", "api.privacy", "api.retention", "api.legal-holds",
  "api.operations", "api.services", "api.episodes", "api.cases",
  "api.consents", "api.coordination", "api.me", "api.simulated-hospital",
  "api.hospital-events", "api.health", "health", "egovph.sso",
]);

export function safeRouteClass(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.includes("health") && parts.includes("live")) return "health.live";
  if (parts.includes("health") && parts.includes("ready")) return "health.ready";
  const liveness = parts.indexOf("liveness");
  if (liveness >= 0)
    return `egov.liveness.${parts[liveness + 1] === "result" ? "result" : "session"}`;
  const prefix = parts.slice(0, 2).map((part) => part.toLowerCase()).join(".");
  if (KNOWN_ROUTE_PREFIXES.has(prefix)) return prefix;
  if (parts.length === 1 && KNOWN_ROUTE_PREFIXES.has(parts[0].toLowerCase()))
    return parts[0].toLowerCase();
  return "unknown";
}
