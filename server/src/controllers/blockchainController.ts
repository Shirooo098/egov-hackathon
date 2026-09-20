import type { Request, Response, NextFunction } from "express";
import { getChainInfo } from "../services/BesuService.js";

async function anchor(req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(410).json({ success: false, error: 'legacy_endpoint_disabled', message: 'Use an authenticated consent event endpoint.' });
  } catch (err) {
    next(err);
  }
}

async function getReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    const { txHash } = req.params;
    if (!txHash)
      return res
        .status(400)
        .json({ success: false, message: "txHash is required" });
    return res.status(404).json({ success: false, error: 'not_found', message: 'Receipt lookup requires an authorized consent event.' });
  } catch (err) {
    next(err);
  }
}

async function chainInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const info = await getChainInfo();
    res.json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
}

export { anchor, getReceipt, chainInfo };
