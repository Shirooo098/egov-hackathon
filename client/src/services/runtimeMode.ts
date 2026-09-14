export const RUNTIME_MODES = [
  "synthetic",
  "partner-sandbox",
  "controlled-live",
  "production",
] as const;

export type RuntimeMode = (typeof RUNTIME_MODES)[number];
export type EffectiveRuntimeMode = RuntimeMode | "unavailable";

export function parseRuntimeMode(value: unknown): RuntimeMode | null {
  return typeof value === "string" &&
    (RUNTIME_MODES as readonly string[]).includes(value)
    ? (value as RuntimeMode)
    : null;
}

export function getRuntimeMode(): EffectiveRuntimeMode {
  return parseRuntimeMode(import.meta.env.VITE_RUNTIME_MODE) ?? "unavailable";
}

export function isMixedWorkflowEnabled(mode: EffectiveRuntimeMode): boolean {
  return mode === "synthetic" || mode === "partner-sandbox";
}

export function isLegacyDemoWorkflowEnabled(mode: EffectiveRuntimeMode): boolean {
  return mode === "synthetic";
}
