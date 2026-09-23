import type { Request, Response, NextFunction } from "express";
import * as eVerify from "../services/eVerifyService.js";

async function initVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      first_name,
      last_name,
      birth_date,
      middle_name,
      suffix,
      face_liveness_session_id,
    } = req.body;
    if (!first_name || !last_name || !birth_date) {
      return res.status(400).json({
        success: false,
        message: "first_name, last_name, birth_date are required",
      });
    }
    const result = await eVerify.verifyIdentity({
      first_name,
      last_name,
      birth_date,
      middle_name,
      suffix,
      face_liveness_session_id,
    });
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const error = err as {
      status?: number;
      code?: string;
      message?: string;
      retryable?: boolean;
      retry_guidance?: string;
    };
    if (error?.status === 503 || error?.code === "capability_deferred") {
      return res.status(503).json({
        success: false,
        error: "capability_deferred",
        code: "capability_deferred",
        status: "unavailable",
        message:
          error.message ||
          "Official eVerify is deferred pending team assessment. Please retry later.",
        retryable: true,
        retry_guidance:
          error.retry_guidance ||
          "Official eVerify is unverified or deferred. Please retry later.",
      });
    }
    next(err);
  }
}

async function checkQR(req: Request, res: Response, next: NextFunction) {
  try {
    const { qr_value } = req.body;
    if (!qr_value) {
      return res.status(400).json({
        success: false,
        message: "qr_value is required",
      });
    }
    const result = await eVerify.decodeQR(qr_value);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const error = err as {
      status?: number;
      code?: string;
      message?: string;
      retryable?: boolean;
      retry_guidance?: string;
    };
    if (error?.status === 503 || error?.code === "capability_deferred") {
      return res.status(503).json({
        success: false,
        error: "capability_deferred",
        code: "capability_deferred",
        status: "unavailable",
        message:
          error.message ||
          "Official eVerify QR decode is deferred pending team assessment. Please retry later.",
        retryable: true,
        retry_guidance:
          error.retry_guidance ||
          "Official eVerify is unverified or deferred. Please retry later.",
      });
    }
    next(err);
  }
}

export { initVerify, checkQR };
