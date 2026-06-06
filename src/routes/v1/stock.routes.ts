// src/routes/v1/stock.routes.ts
import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { Product } from "../../models/Product.js";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

const StockAdjustSchema = z.object({
  delta: z.number().int().optional(), // e.g. -1 to decrement
  set: z.number().int().optional(), // set absolute value (use sparingly)
});

// PATCH /api/v1/products/:id/stock
router.patch("/products/:id/stock", async (req, res, next) => {
  try {
    await dbConnect();
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, code: "INVALID_ID" });
    }

    const payload = StockAdjustSchema.parse(req.body);

    // If set provided -> set absolute, otherwise apply delta atomically
    if (typeof payload.set === "number") {
      const updated = await Product.findByIdAndUpdate(
        id,
        { $set: { stock: payload.set } },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();
      if (!updated)
        return res.status(404).json({ ok: false, code: "NOT_FOUND" });
      
      // Check for stock alerts
      try {
        const { createNotification } = await import("../v1/admin.notification.routes.js");
        if (updated.stock <= 0) {
          await createNotification(
            "OUT_OF_STOCK",
            "Out of Stock Alert",
            `${updated.title} is now out of stock`,
            String(updated._id)
          );
        } else if (updated.stock <= 10) {
          await createNotification(
            "LOW_STOCK",
            "Low Stock Alert",
            `${updated.title} is running low (${updated.stock} left)`,
            String(updated._id)
          );
        }
      } catch (notificationError) {
        console.error("Failed to create stock notification:", notificationError);
      }
      
      return res.json({
        ok: true,
        data: { _id: String(updated._id), stock: updated.stock },
      });
    }

    // delta path: ensure stock never goes negative using findOneAndUpdate with $inc and conditional query
    const delta = payload.delta ?? 0;
    if (delta === 0)
      return res.status(400).json({ ok: false, code: "NO_CHANGE" });

    // if decreasing, ensure enough stock; if increasing, just inc
    let query: any = { _id: id };
    if (delta < 0) {
      query.stock = { $gte: Math.abs(delta) };
    }
    const updated = await Product.findOneAndUpdate(
      query,
      { $inc: { stock: delta } },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();

    if (!updated) {
      return res.status(409).json({
        ok: false,
        code: "INSUFFICIENT_STOCK",
        message: "Not enough stock to apply change",
      });
    }

    // Check for stock alerts after delta update
    try {
      const { createNotification } = await import("../v1/admin.notification.routes.js");
      if (updated.stock <= 0) {
        await createNotification(
          "OUT_OF_STOCK",
          "Out of Stock Alert",
          `${updated.title} is now out of stock`,
          String(updated._id)
        );
      } else if (updated.stock <= 10) {
        await createNotification(
          "LOW_STOCK",
          "Low Stock Alert",
          `${updated.title} is running low (${updated.stock} left)`,
          String(updated._id)
        );
      }
    } catch (notificationError) {
      console.error("Failed to create stock notification:", notificationError);
    }

    return res.json({
      ok: true,
      data: { _id: String(updated._id), stock: updated.stock },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
