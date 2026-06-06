import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { dbConnect } from "../../db/connection.js";
import { Customer } from "../../models/Customer.js";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { signCustomerToken } from "../../utils/customerJwt.js";
import { requireCustomer } from "../../middlewares/customerAuth.js";
const router = Router();
const RegisterDTO = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().optional(),
});
const LoginDTO = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
const ForgotPasswordDTO = z.object({
    email: z.string().email(),
});
const ResetPasswordDTO = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
});
// POST /customers/auth/register
router.post("/customers/auth/register", async (req, res, next) => {
    try {
        await dbConnect();
        const { name, email, password, phone } = RegisterDTO.parse(req.body);
        const existing = await Customer.findOne({ email }).lean();
        if (existing) {
            return res.status(409).json({ ok: false, code: "EMAIL_EXISTS" });
        }
        const passwordHash = await hashPassword(password);
        const customer = await Customer.create({
            name,
            email,
            phone,
            passwordHash,
            isVerified: true,
        });
        const token = signCustomerToken({
            sub: customer._id.toString(),
            email: customer.email,
            role: "CUSTOMER",
        });
        res.status(201).json({
            ok: true,
            data: {
                accessToken: token,
                customer: {
                    id: customer._id.toString(),
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /customers/auth/login
router.post("/customers/auth/login", async (req, res, next) => {
    try {
        await dbConnect();
        const { email, password } = LoginDTO.parse(req.body);
        const customer = await Customer.findOne({ email }).lean();
        if (!customer) {
            return res.status(401).json({ ok: false, code: "INVALID_CREDENTIALS" });
        }
        const ok = await verifyPassword(password, customer.passwordHash);
        if (!ok) {
            return res.status(401).json({ ok: false, code: "INVALID_CREDENTIALS" });
        }
        const token = signCustomerToken({
            sub: customer._id.toString(),
            email: customer.email,
            role: "CUSTOMER",
        });
        res.json({
            ok: true,
            data: {
                accessToken: token,
                customer: {
                    id: customer._id.toString(),
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /customers/auth/forgot-password
router.post("/customers/auth/forgot-password", async (req, res, next) => {
    try {
        await dbConnect();
        const { email } = ForgotPasswordDTO.parse(req.body);
        const customer = await Customer.findOne({ email });
        if (!customer) {
            return res.json({ ok: true, message: "If email exists, reset link sent" });
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        await Customer.findByIdAndUpdate(customer._id, {
            resetToken,
            resetTokenExpiry,
        });
        res.json({ ok: true, message: "If email exists, reset link sent" });
    }
    catch (err) {
        next(err);
    }
});
// POST /customers/auth/reset-password
router.post("/customers/auth/reset-password", async (req, res, next) => {
    try {
        await dbConnect();
        const { token, password } = ResetPasswordDTO.parse(req.body);
        const customer = await Customer.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() },
        });
        if (!customer) {
            return res.status(400).json({ ok: false, code: "INVALID_TOKEN" });
        }
        const passwordHash = await hashPassword(password);
        await Customer.findByIdAndUpdate(customer._id, {
            passwordHash,
            resetToken: undefined,
            resetTokenExpiry: undefined,
        });
        res.json({ ok: true, message: "Password reset successful" });
    }
    catch (err) {
        next(err);
    }
});
// GET /customers/profile
router.get("/customers/profile", requireCustomer, async (req, res, next) => {
    try {
        await dbConnect();
        const customerId = req.customer._id;
        const customer = await Customer.findById(customerId)
            .select("-passwordHash -resetToken -resetTokenExpiry")
            .lean();
        if (!customer) {
            return res.status(404).json({ ok: false, code: "CUSTOMER_NOT_FOUND" });
        }
        res.json({
            ok: true,
            data: {
                id: customer._id.toString(),
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                isVerified: customer.isVerified,
                createdAt: customer.createdAt,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// PUT /customers/profile
const UpdateProfileDTO = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.object({
        houseOrVillage: z.string().optional(),
        roadOrPostOffice: z.string().optional(),
        blockOrThana: z.string().optional(),
        district: z.string().optional(),
    }).optional(),
});
router.patch("/customers/profile", requireCustomer, async (req, res, next) => {
    try {
        await dbConnect();
        const customerId = req.customer._id;
        const updates = UpdateProfileDTO.parse(req.body);
        const customer = await Customer.findByIdAndUpdate(customerId, { $set: updates }, { new: true, runValidators: true }).select("-passwordHash -resetToken -resetTokenExpiry");
        if (!customer) {
            return res.status(404).json({ ok: false, code: "CUSTOMER_NOT_FOUND" });
        }
        res.json({
            ok: true,
            data: {
                id: customer._id.toString(),
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                isVerified: customer.isVerified,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
export default router;
