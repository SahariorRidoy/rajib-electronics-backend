import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { DeliverySettings } from "../../models/DeliverySettings.js";

const router = Router();

// Public route - Get delivery settings
router.get("/delivery-settings", async (req, res, next) => {
  try {
    await dbConnect();
    let settings = await DeliverySettings.findOne({ isActive: true }).lean();
    
    if (!settings) {
      settings = await DeliverySettings.create({
        freeDeliveryThreshold: 1000,
        deliveryCharge: 50,
        isActive: true,
      });
    }
    
    res.json({ ok: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// Calculate delivery charge for cart
router.post("/delivery-charge", async (req, res, next) => {
  try {
    await dbConnect();
    const { cartAmount } = req.body;
    
    if (typeof cartAmount !== "number" || cartAmount < 0) {
      return res.status(400).json({ ok: false, code: "INVALID_AMOUNT" });
    }
    
    const settings = await DeliverySettings.findOne({ isActive: true }).lean();
    
    if (!settings) {
      return res.json({ ok: true, data: { deliveryCharge: 50, isFree: false } });
    }
    
    const isFree = cartAmount >= settings.freeDeliveryThreshold;
    const deliveryCharge = isFree ? 0 : settings.deliveryCharge;
    
    res.json({
      ok: true,
      data: {
        deliveryCharge,
        isFree,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
