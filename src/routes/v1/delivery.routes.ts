import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { DeliverySettings } from "../../models/DeliverySettings.js";

const router = Router();

// Public route - Get delivery settings
router.get("/delivery-settings", async (req, res, next) => {
  try {
    await dbConnect();
    let raw = await DeliverySettings.findOne({ isActive: true }).lean() as any;

    if (!raw) {
      raw = await DeliverySettings.create({
        freeDeliveryThreshold: 1000,
        insideDhakaCharge: 60,
        outsideDhakaCharge: 120,
        isActive: true,
      });
    }

    const fallback = raw.deliveryCharge ?? 60;
    const data = {
      ...raw,
      insideDhakaCharge: raw.insideDhakaCharge ?? fallback,
      outsideDhakaCharge: raw.outsideDhakaCharge ?? fallback,
      deliveryChargePaymentRequired: raw.deliveryChargePaymentRequired ?? false,
    };

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Calculate delivery charge — accepts zone: "inside" | "outside" (default: "outside")
router.post("/delivery-charge", async (req, res, next) => {
  try {
    await dbConnect();
    const { cartAmount, zone } = req.body;

    if (typeof cartAmount !== "number" || cartAmount < 0) {
      return res.status(400).json({ ok: false, code: "INVALID_AMOUNT" });
    }

    const raw = await DeliverySettings.findOne({ isActive: true }).lean() as any;

    if (!raw) {
      const fallbackCharge = zone === "inside" ? 60 : 120;
      return res.json({
        ok: true,
        data: {
          deliveryCharge: fallbackCharge,
          isFree: false,
          freeDeliveryThreshold: 1000,
          insideDhakaCharge: 60,
          outsideDhakaCharge: 120,
          zone: zone || "outside",
          deliveryChargePaymentRequired: false,
        },
      });
    }

    const legacyFallback = raw.deliveryCharge ?? 60;
    const insideDhakaCharge = raw.insideDhakaCharge ?? legacyFallback;
    const outsideDhakaCharge = raw.outsideDhakaCharge ?? legacyFallback;

    const isFree = cartAmount >= raw.freeDeliveryThreshold;
    const baseCharge = zone === "inside" ? insideDhakaCharge : outsideDhakaCharge;
    const deliveryCharge = isFree ? 0 : baseCharge;

    res.json({
      ok: true,
      data: {
        deliveryCharge,
        isFree,
        freeDeliveryThreshold: raw.freeDeliveryThreshold,
        insideDhakaCharge,
        outsideDhakaCharge,
        zone: zone || "outside",
        deliveryChargePaymentRequired: raw.deliveryChargePaymentRequired ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
