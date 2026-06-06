import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { dbConnect } from "../../db/connection.js";
import { Admin } from "../../models/Admin.js";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { sendOTPEmail } from "../../services/email.service.js";
import { requireAdmin } from "../../middlewares/auth.js";
const router = Router();
const LoginDTO = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
const ChangePasswordDTO = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
});
const ForgotPasswordDTO = z.object({
    email: z.string().email(),
});
const VerifyOTPDTO = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(6),
});
// router.get("/auth/ping", (_req, res) => {
//   res.json({ ok: true, where: "admin.auth.routes.ts" });
// });
router.post("/auth/login", async (req, res, next) => {
    try {
        // console.log("[LOGIN] start", new Date().toISOString());
        await dbConnect();
        // console.log("[LOGIN] connected to DB");
        const { email, password } = LoginDTO.parse(req.body);
        // console.log("[LOGIN] parsed body", email);
        const admin = await Admin.findOne({ email }).lean();
        // console.log("[LOGIN] admin found?", !!admin);
        if (!admin)
            return res.status(401).json({ ok: false, code: "INVALID_CREDENTIALS" });
        if (!("passwordHash" in admin) || !admin.passwordHash) {
            // console.error("[LOGIN] admin has no passwordHash field");
            return res.status(500).json({ ok: false, code: "BAD_ADMIN_DOC" });
        }
        const ok = await verifyPassword(password, admin.passwordHash);
        // console.log("[LOGIN] password ok?", ok);
        if (!ok)
            return res.status(401).json({ ok: false, code: "INVALID_CREDENTIALS" });
        const payload = {
            sub: admin._id.toString(),
            email: admin.email,
            role: "ADMIN",
        };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);
        await Admin.updateOne({ _id: admin._id }, { refreshToken });
        // console.log("[LOGIN] success");
        res.json({ ok: true, data: { accessToken, refreshToken } });
    }
    catch (err) {
        // console.error("[LOGIN] error:", err);
        next(err);
    }
});
router.post("/auth/refresh", async (req, res, next) => {
    try {
        await dbConnect();
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(401).json({ ok: false, code: "NO_REFRESH_TOKEN" });
        const decoded = verifyRefreshToken(refreshToken);
        const admin = await Admin.findById(decoded.sub).lean();
        if (!admin || admin.refreshToken !== refreshToken)
            return res.status(401).json({ ok: false, code: "INVALID_REFRESH_TOKEN" });
        const payload = {
            sub: admin._id.toString(),
            email: admin.email,
            role: "ADMIN",
        };
        const accessToken = signAccessToken(payload);
        res.json({ ok: true, data: { accessToken } });
    }
    catch (err) {
        next(err);
    }
});
router.post("/auth/change-password", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { currentPassword, newPassword } = ChangePasswordDTO.parse(req.body);
        const adminId = req.user._id;
        const admin = await Admin.findById(adminId);
        if (!admin)
            return res.status(404).json({ ok: false, code: "ADMIN_NOT_FOUND" });
        const isValid = await verifyPassword(currentPassword, admin.passwordHash);
        if (!isValid)
            return res.status(401).json({ ok: false, code: "INVALID_PASSWORD" });
        admin.passwordHash = await hashPassword(newPassword);
        await admin.save();
        res.json({ ok: true, message: "Password changed successfully" });
    }
    catch (err) {
        next(err);
    }
});
router.post("/auth/forgot-password", async (req, res, next) => {
    try {
        await dbConnect();
        const { email } = ForgotPasswordDTO.parse(req.body);
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.json({ ok: true, message: "If email exists, OTP sent" });
        }
        const otp = crypto.randomInt(100000, 999999).toString();
        const resetOTPExpiry = new Date(Date.now() + 600000); // 10 minutes
        admin.resetOTP = otp;
        admin.resetOTPExpiry = resetOTPExpiry;
        await admin.save();
        await sendOTPEmail(email, otp);
        res.json({ ok: true, message: "If email exists, OTP sent" });
    }
    catch (err) {
        next(err);
    }
});
router.post("/auth/reset-password", async (req, res, next) => {
    try {
        await dbConnect();
        const { email, otp, newPassword } = VerifyOTPDTO.parse(req.body);
        const admin = await Admin.findOne({
            email,
            resetOTP: otp,
            resetOTPExpiry: { $gt: new Date() },
        });
        if (!admin) {
            return res.status(400).json({ ok: false, code: "INVALID_OTP" });
        }
        admin.passwordHash = await hashPassword(newPassword);
        admin.resetOTP = undefined;
        admin.resetOTPExpiry = undefined;
        await admin.save();
        res.json({ ok: true, message: "Password reset successful" });
    }
    catch (err) {
        next(err);
    }
});
export default router;
