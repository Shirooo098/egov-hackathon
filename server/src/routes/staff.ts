import express from 'express';
import { signIn, generic, SESSION_COOKIE } from '../auth/staff.js';
import { requireSameOrigin } from '../middleware/origin.js';
import { cookieOptions } from '../auth/cookie.js';
const createStaffRouter = (authenticate = signIn) => {
const router = express.Router();
const cookie = `${SESSION_COOKIE}=TOKEN; ${cookieOptions}`;
router.post(['/staff/sign-in', '/staff/login'], requireSameOrigin, async (req, res, next) => {
  try {
    if (['role', 'hospitalId', 'hospital_id', 'serviceScope', 'service_scope'].some((field) => Object.prototype.hasOwnProperty.call(req.body ?? {}, field))) return res.status(401).json(generic);
    const result = await authenticate(req.body?.username, req.body?.password, req.body?.totp ?? req.body?.mfaCode ?? req.body?.recoveryCode);
    if (!result) return res.status(401).json(generic);
    res.setHeader('Set-Cookie', cookie.replace('TOKEN', encodeURIComponent(result.token)));
    return res.status(200).json({ success: true, account: result.account });
  } catch (e) { return next(e); }
});
return router;
};
const router = createStaffRouter();
export { createStaffRouter };
export default router;
