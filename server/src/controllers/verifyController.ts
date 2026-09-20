import type { Request, Response, NextFunction } from "express";
import * as eVerify from "../services/eVerifyService.js";
import * as eMessage from "../services/eMessageService.js";

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
      return res
        .status(400)
        .json({
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
  } catch (err) {
    next(err);
  }
}

async function checkQR(req: Request, res: Response, next: NextFunction) {
  try {
    const { qr_value } = req.body;
    if (!qr_value)
      return res
        .status(400)
        .json({ success: false, message: "qr_value is required" });
    const result = await eVerify.decodeQR(qr_value);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export { initVerify, checkQR };
