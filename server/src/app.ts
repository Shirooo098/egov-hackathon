import "dotenv/config";
import express from "express";
import cors from "cors";
import type { Request, Response, NextFunction } from "express";
import { createSessionRouter } from "./routes/session.js";
import staffRouter from "./routes/staff.js";
import rebaselineRouter from "./routes/rebaseline.js";
import platformRouter from "./routes/platform.js";
import matchRouter from "./routes/match.js";
import scheduleRouter from "./routes/schedule.js";
import blockchainRouter from "./routes/blockchain.js";
import egovaiRouter from "./routes/egovai.js";
import egovRouter from "./routes/egov.js";
import emessageRouter from "./routes/emessage.js";
import { getPool } from "./db/pool.js";
import {
  isDisabledService,
  isLiveMode,
  loadRuntimeConfig,
  type RuntimeConfig,
} from "./runtime/config.js";
import { readiness } from "./runtime/health.js";
import { createV1Router } from "./routes/v1.js";
import {
  createCsrfProtection,
  redactV1Response,
  requestCorrelation,
  throttle,
  v1Cors,
} from "./middleware/v1-security.js";
import { SESSION_COOKIE } from "./auth/service.js";
import { createEgovCallbackRouter } from "./routes/egov-auth.js";
import { egovchainEnabled } from "./services/EgovChainService.js";
import { safeRouteClass } from "./middleware/route-class.js";

export type AppOptions = {
  config?: RuntimeConfig;
  databaseCheck?: () => Promise<void>;
};

function containsDisabledService(value: unknown): boolean {
  if (isDisabledService(value)) return true;
  if (Array.isArray(value)) return value.some(containsDisabledService);
  if (value && typeof value === "object")
    return Object.values(value).some(containsDisabledService);
  return false;
}

export function createApp(options: AppOptions = {}) {
  let config = options.config;
  let configUnavailable = false;
  if (!config) {
    try {
      config = loadRuntimeConfig();
    } catch {
      configUnavailable = true;
    }
  }
  const app = express();

  // Middleware
  app.use(requestCorrelation);
  const allowedOrigins = config?.allowedOrigins ?? [];
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, !origin || allowedOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (configUnavailable) {
    const unavailable = (_req: Request, res: Response) =>
      res
        .status(503)
        .json({
          success: false,
          error: "runtime_unavailable",
          message: "Runtime configuration is unavailable",
        });
    app.get(["/health/live", "/api/health/live"], unavailable);
    app.get(["/health/ready", "/api/health/ready", "/api/health"], unavailable);
    app.use(unavailable);
    return app;
  }

  // Live modes fail closed for the not-yet-approved kidney services. This is a
  // boundary guard; it does not infer approval from database contents.
  app.use((req, res, next) => {
    const path = req.path;
    const mixedWorkflow =
      path.startsWith("/api/matches") ||
      path.startsWith("/api/schedule") ||
      path.startsWith("/api/blockchain") ||
      path.startsWith("/api/egovai") ||
      path.startsWith("/api/hospital/") ||
      path.startsWith("/api/pairs");
    const syntheticOnlySurface =
      mixedWorkflow ||
      path.startsWith("/api/v1/matches") ||
      path.startsWith("/api/v1/schedule") ||
      path.startsWith("/api/v1/blockchain") ||
      path.startsWith("/api/v1/egovai") ||
      path.startsWith("/api/emessage") ||
      path.startsWith("/api/v1/emessage");
    if (
      config!.mode !== "synthetic" &&
      (syntheticOnlySurface ||
        containsDisabledService({ ...req.query, ...req.params, ...req.body }))
    ) {
      res
        .status(404)
        .json({
          success: false,
          error: "service_disabled",
          message: "Requested service is disabled",
        });
      return;
    }
    next();
  });

  // Request logger
  app.use((req, res, next) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        route: safeRouteClass(req.path),
        requestId: (req as Request & { requestId?: string }).requestId,
      }),
    );
    next();
  });

  // Versioned boundary: the legacy /api routes remain intentionally compatible.
  app.use("/api/v1", v1Cors(config!));
  app.use("/api/v1", throttle(config!));
  app.use("/api/v1", createCsrfProtection(SESSION_COOKIE));
  app.use("/api/v1", redactV1Response);
  app.use("/api/v1", createV1Router(config!));
  app.use("/egovph", throttle(config!), createEgovCallbackRouter(config!));

  // Health check endpoints
  const liveHealth = (_req: Request, res: Response) => {
    res
      .status(200)
      .json({
        status: "alive",
        mode: config!.mode,
        timestamp: new Date().toISOString(),
      });
  };
  app.get("/health/live", liveHealth);
  app.get("/api/health/live", liveHealth);

  const readyHealth = async (_req: Request, res: Response) => {
    const result = await readiness(config!, {
      check:
        options.databaseCheck ??
        (async () => {
          await getPool().query("SELECT 1");
        }),
    });
    res.status(result.status === "ready" ? 200 : 503).json(result);
  };
  app.get("/health/ready", readyHealth);
  app.get("/api/health/ready", readyHealth);

  app.get("/api/health", (_req, res) => {
    const inactiveStatus = isLiveMode(config!.mode) ? "DISABLED" : "UNAVAILABLE";
    res.status(200).json({
      success: true,
      status: "alive",
      mode: config!.mode,
      message: "eBuhay DICT eGov Platform API is operational",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      services: {
        eMessage: !isLiveMode(config!.mode) && process.env.EMESSAGE_BASE_URL?.trim() && process.env.EMESSAGE_API_TOKEN?.trim() ? "CONFIGURED_STAGING" : inactiveStatus,
        eGovAI: inactiveStatus,
        eGovChain: !isLiveMode(config!.mode) && egovchainEnabled() ? "CONFIGURED_STAGING" : inactiveStatus,
      },
    });
  });

  // Routes
  app.use("/api/auth", createSessionRouter(config!));
  app.use("/api/auth", staffRouter);
  app.use("/api/auth", (_req, res) =>
    res.status(404).json({ success: false, error: "not_found", message: "Route not found" }),
  );
  if (config!.mode !== "synthetic")
    app.use("/api/egov", (_req, res) =>
      res
        .status(404)
        .json({
          success: false,
          error: "not_found",
          message: "Route not found",
        }),
    );
  if (config!.mode === "synthetic") app.use("/api/emessage", emessageRouter);
  // Rebaseline routes apply authentication at each endpoint. Do not mount a
  // router-wide guard here: legacy/public /api integrations must remain public.
  if (config!.mode === "synthetic") {
    app.use("/api", rebaselineRouter);
    app.use("/api/platform", platformRouter);
    app.use("/api", platformRouter);
    app.use("/api/matches", matchRouter);
    app.use("/api/schedule", scheduleRouter);
    app.use("/api/blockchain", blockchainRouter);
    app.use("/api/egovai", egovaiRouter);
  }
  if (config!.mode === "partner-sandbox") {
    app.use("/api/platform", platformRouter);
    app.use("/api", platformRouter);
  }
  if (config!.mode === "synthetic") app.use("/api/egov", egovRouter);
  console.log("✅ Registered /api/egov routes");
  console.log("✅ Registered /api/emessage routes");

  // 404 handler
  app.use((req, res) => {
    const requestId = (req as Request & { requestId?: string }).requestId;
    if (req.path.startsWith("/api/v1")) {
      res
        .status(404)
        .json({
          success: false,
          error: "not_found",
          message: "Route not found",
          requestId,
        });
      return;
    }
    res
      .status(404)
      .json({
        success: false,
        message: "Route not found",
      });
  });

  // Global error handler
  app.use(
    (
      err: Error & { status?: number },
      req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const requestId = (req as Request & { requestId?: string }).requestId;
      const status =
        typeof err.status === "number" && err.status >= 400 && err.status < 600
          ? err.status
          : 500;
      const errorCategory = status >= 500 ? "server_error" : "client_error";
      console.error(
        JSON.stringify({
          level: "error",
          requestId,
          route: safeRouteClass(req.path),
          status,
          category: errorCategory,
          message: "request_failed",
        }),
      );
      if (req.path.startsWith("/api/v1")) {
        res
          .status(
            err.status && err.status >= 400 && err.status < 500
              ? err.status
              : 500,
          )
          .json({
            success: false,
            error: "internal_error",
            message: "Request failed",
            requestId,
          });
        return;
      }
      res.status(err.status || 500).json({
        success: false,
        message: "Internal Server Error",
        error: null,
      });
    },
  );

  return app;
}

export default createApp();
