// src/routes/v1/invoicePublic.routes.ts
import express from "express";
import { dbConnect } from "../../db/connection.js";
import { InvoiceModel } from "../../models/Invoice.model.js";
import mongoose from "mongoose";

const router = express.Router();

async function ensureDb() {
  try {
    await dbConnect();
  } catch (err) {
    console.error("DB connect failed:", err);
    throw new Error("DB_CONNECT_FAILED");
  }
}

/**
 * GET /api/v1/invoices/by-order/:orderId
 * - Defensive: only constructs ObjectId when valid
 * - Tries three strategies: ObjectId, numeric orderId, string orderId
 * - Always catches errors and logs them; never crashes process
 */
router.get("/invoices/by-order/:orderId", async (req, res) => {
  try {
    await ensureDb();

    const { orderId } = req.params;
    if (!orderId)
      return res.status(400).json({ ok: false, error: "orderId required" });

    // helper: try to parse as ObjectId safely
    const tryObjectIdLookup = async (val: string) => {
      try {
        if (typeof val === "string" && mongoose.Types.ObjectId.isValid(val)) {
          // Use new to satisfy TS typing and avoid callable errors
          const objId = new mongoose.Types.ObjectId(String(val));
          // try matching both 'orderId' (ObjectId field) or 'order' (legacy)
          const found = await InvoiceModel.findOne({
            $or: [{ orderId: objId }, { order: objId }],
          }).lean();
          if (found) return found;
        }
      } catch (e) {
        console.warn(
          "objectId lookup error for",
          val,
          e && e.message ? e.message : e
        );
      }
      return null;
    };

    // 1) ObjectId lookup (only when valid)
    const byObj = await tryObjectIdLookup(orderId);
    if (byObj) return res.json({ ok: true, data: byObj });

    // 2) numeric fallback
    const maybeNum = Number(orderId);
    if (!Number.isNaN(maybeNum)) {
      try {
        const invByNum = await InvoiceModel.findOne({
          orderId: maybeNum,
        }).lean();
        if (invByNum) return res.json({ ok: true, data: invByNum });
      } catch (e) {
        console.warn(
          "numeric lookup error for",
          orderId,
          e && e.message ? e.message : e
        );
      }
    }

    // 3) string fallback (explicit string-field)
    try {
      const invByString = await InvoiceModel.findOne({
        orderId: String(orderId),
      }).lean();
      if (invByString) return res.json({ ok: true, data: invByString });
    } catch (e) {
      console.warn(
        "string lookup error for",
        orderId,
        e && e.message ? e.message : e
      );
    }

    // Not found
    return res.status(404).json({ ok: false, error: "not found" });
  } catch (err: any) {
    console.error(
      "public invoice by-order err:",
      err && err.stack ? err.stack : err
    );
    if (String(err?.message || "").includes("DB_CONNECT_FAILED")) {
      return res.status(500).json({ ok: false, error: "db connect failed" });
    }
    // Generic server error (but we logged details)
    return res.status(500).json({ ok: false, error: "server error" });
  }
});

export default router;
