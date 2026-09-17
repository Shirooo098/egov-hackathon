import express from "express";
import verifyRouter from "./verify.js";
import { createSessionRouter } from "./session.js";
import staffRouter from "./staff.js";
import rebaselineRouter from "./rebaseline.js";
import platformRouter, { createCitizenPlatformRouter } from "./platform.js";
import matchRouter from "./match.js";
import scheduleRouter from "./schedule.js";
import blockchainRouter from "./blockchain.js";
import egovaiRouter from "./egovai.js";
import egovRouter from "./egov.js";
import emessageRouter from "./emessage.js";
import bloodRouter from "./blood.js";
import { createHospitalEventsRouter } from "./hospital-events.js";
import { createSyntheticHospitalRouter } from "./synthetic-hospital.js";
import { createReconciliationRouter } from "./reconciliation.js";
import { createEgovAuthRouter } from "./egov-auth.js";
import { createProfileRouter } from "./profile.js";
import { createPrivacyRouter } from "./privacy.js";
import { createRetentionRouter } from "./retention.js";
import { createOperationsRouter } from "./operations.js";
import { csrfToken } from "../middleware/v1-security.js";
import type { RuntimeConfig } from "../runtime/config.js";

export function createV1Router(config: RuntimeConfig) {
  const router = express.Router();
  const unavailable = (_req: express.Request, res: express.Response) =>
    res
      .status(404)
      .json({ success: false, error: "not_found", message: "Route not found" });
  router.get(["/csrf", "/csrf-token"], csrfToken);
  router.get("/auth/csrf", csrfToken);
  router.get("/health", (_req, res) =>
    res.json({ success: true, status: "alive", mode: config.mode }),
  );
  if (config.mode !== "synthetic") router.use("/egov", unavailable);
  router.use("/auth", verifyRouter);
  router.use("/auth", createSessionRouter(config));
  router.use("/auth/egov", createEgovAuthRouter(config));
  router.use("/auth", staffRouter);
  router.use("/hospital-events", createHospitalEventsRouter(config));
  if (config.mode === "synthetic")
    router.use("/", createSyntheticHospitalRouter(config));
  router.use("/reconciliation", createReconciliationRouter(config));
  router.use("/blood-requests", bloodRouter);
  router.use("/profile", createProfileRouter(config));
  router.use("/privacy", createPrivacyRouter(config));
  router.use("/retention", createRetentionRouter(config));
  router.use("/legal-holds", createRetentionRouter(config));
  router.use("/operations", createOperationsRouter(config));
  if (config.mode === "synthetic") router.use("/emessage", emessageRouter);
  if (config.mode === "synthetic") router.use("/egov", egovRouter);
  router.use("/", createCitizenPlatformRouter(config.mode));
  if (config.mode === "synthetic" || config.mode === "partner-sandbox") {
    router.use("/platform", platformRouter);
  }
  if (config.mode === "synthetic") {
    router.use("/matches", matchRouter);
    router.use("/schedule", scheduleRouter);
    router.use("/blockchain", blockchainRouter);
    router.use("/egovai", egovaiRouter);
    router.use("/", rebaselineRouter);
    router.use("/", platformRouter);
  }
  return router;
}
export default createV1Router;
