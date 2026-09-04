import { Router } from "express";
import { z } from "zod";
import { dbConnect } from "../../db/connection.js";
import { DeliverySettings } from "../../models/DeliverySettings.js";
import { requireAdmin } from "../../middlewares/auth.js";
const router = Router();
const DeliverySettingsDTO = z.object({
    freeDeliveryThreshold: z.number().min(0),
    insideDhakaCharge: z.number().min(0).optional(),
    outsideDhakaCharge: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    deliveryChargePaymentRequired: z.boolean().optional(),
});
// Get delivery settings — normalise old documents that still have deliveryCharge
router.get("/delivery-settings", async (req, res, next) => {
    try {
        await dbConnect();
        const raw = await DeliverySettings.findOne().lean();
        if (!raw) {
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        }
        // Migrate: if new fields are missing, derive from old deliveryCharge
        const fallback = raw.deliveryCharge ?? 60;
        const normalised = {
            ...raw,
            insideDhakaCharge: raw.insideDhakaCharge ?? fallback,
            outsideDhakaCharge: raw.outsideDhakaCharge ?? fallback,
            deliveryChargePaymentRequired: raw.deliveryChargePaymentRequired ?? false,
        };
        res.json({ ok: true, data: normalised });
    }
    catch (err) {
        next(err);
    }
});
// Create delivery settings
router.post("/delivery-settings", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const existing = await DeliverySettings.findOne();
        if (existing) {
            return res.status(400).json({ ok: false, code: "ALREADY_EXISTS" });
        }
        const data = DeliverySettingsDTO.parse(req.body);
        const settings = await DeliverySettings.create({
            freeDeliveryThreshold: data.freeDeliveryThreshold,
            insideDhakaCharge: data.insideDhakaCharge ?? 60,
            outsideDhakaCharge: data.outsideDhakaCharge ?? 120,
            isActive: data.isActive ?? true,
            deliveryChargePaymentRequired: data.deliveryChargePaymentRequired ?? false,
        });
        res.status(201).json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
// Update delivery settings — also writes new fields so old doc gets migrated
router.patch("/delivery-settings", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const data = DeliverySettingsDTO.parse(req.body);
        const settings = await DeliverySettings.findOne();
        if (!settings) {
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        }
        settings.freeDeliveryThreshold = data.freeDeliveryThreshold;
        if (data.insideDhakaCharge !== undefined)
            settings.insideDhakaCharge = data.insideDhakaCharge;
        if (data.outsideDhakaCharge !== undefined)
            settings.outsideDhakaCharge = data.outsideDhakaCharge;
        if (data.isActive !== undefined)
            settings.isActive = data.isActive;
        if (data.deliveryChargePaymentRequired !== undefined)
            settings.deliveryChargePaymentRequired = data.deliveryChargePaymentRequired;
        await settings.save();
        res.json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
export default router;
