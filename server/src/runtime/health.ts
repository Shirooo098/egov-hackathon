import type { RuntimeConfig } from "./config.js";

export type HealthDependency = { check: () => Promise<void> };

export async function readiness(
  config: RuntimeConfig,
  dependency: HealthDependency,
): Promise<{
  status: "ready" | "not_ready";
  mode: string;
  database: "ready" | "unavailable";
  integrations: Record<string, "disabled">;
}> {
  try {
    await dependency.check();
    return {
      status: "ready",
      mode: config.mode,
      database: "ready",
      integrations: {
        hospital: "disabled",
        egov: "disabled",
        worker: "disabled",
      },
    };
  } catch {
    return {
      status: "not_ready",
      mode: config.mode,
      database: "unavailable",
      integrations: {
        hospital: "disabled",
        egov: "disabled",
        worker: "disabled",
      },
    };
  }
}
