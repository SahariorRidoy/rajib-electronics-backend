import { Router } from "express";
import { z } from "zod";
import { dbConnect } from "../../db/connection.js";
import { DeliverySettings } from "../../models/DeliverySettings.js";
import { requireAdmin } from "../../middlewares/auth.js";
const router = Router();
const DeliverySettingsDTO = z.object({
    freeDeliveryThreshold: z.number().min(0),
    deliveryCharge: z.number().min(0),
    isActive: z.boolean().optional(),
});
// Get delivery settings
router.get("/delivery-settings", async (req, res, next) => {
    try {
        await dbConnect();
        const settings = await DeliverySettings.findOne().lean();
        if (!settings) {
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        }
        res.json({ ok: true, data: settings });
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
        const settings = await DeliverySettings.create(data);
        res.status(201).json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
// Update delivery settings
router.patch("/delivery-settings", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const data = DeliverySettingsDTO.parse(req.body);
        const settings = await DeliverySettings.findOne();
        if (!settings) {
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        }
        Object.assign(settings, data);
        await settings.save();
        res.json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
export default router;
