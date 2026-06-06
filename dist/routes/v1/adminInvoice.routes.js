// src/routes/v1/adminInvoice.routes.ts
import express from "express";
import { dbConnect } from "../../db/connection.js";
import { InvoiceModel } from "../../models/Invoice.model.js";
import * as invoiceService from "../../services/invoice.service.js";
import { requireAdmin } from "../../middlewares/auth.js";
import { streamInvoicePdfById } from "../../services/invoicePdf.service.js";
import mongoose from "mongoose";
const router = express.Router();
/**
 * Helper: ensure database connected and surface readable error
 */
async function ensureDb() {
    try {
        await dbConnect();
    }
    catch (err) {
        console.error("DB connect failed:", err);
        throw new Error("DB_CONNECT_FAILED");
    }
}
/** List invoices for admin (account optional) */
router.get("/", requireAdmin, async (req, res) => {
    try {
        await ensureDb();
        // Type-safe handling for account_id query param (string | string[] | undefined)
        let accountId;
        const rawAccount = req.query.account_id;
        if (typeof rawAccount === "string") {
            accountId = rawAccount;
        }
        else if (Array.isArray(rawAccount) && typeof rawAccount[0] === "string") {
            accountId = rawAccount[0];
        }
        else {
            // fallback to req.user if available (cast to any)
            accountId = req.user?.accountId;
        }
        const limit = Math.min(Number(req.query.limit ?? 200), 1000);
        const list = await invoiceService.listInvoices(accountId, limit);
        return res.json({ ok: true, data: list });
    }
    catch (err) {
        console.error("admin invoices list err:", err);
        if (String(err.message) === "DB_CONNECT_FAILED")
            return res.status(500).json({ ok: false, error: "db connect failed" });
        return res.status(500).json({ ok: false, error: "server error" });
    }
});
/** Get invoice detail */
router.get("/:id", requireAdmin, async (req, res) => {
    try {
        await ensureDb();
        const inv = await invoiceService.getInvoice(req.params.id);
        if (!inv)
            return res.status(404).json({ ok: false, error: "not found" });
        return res.json({ ok: true, data: inv });
    }
    catch (err) {
        console.error("admin invoice get err:", err);
        return res.status(500).json({ ok: false, error: "server error" });
    }
});
/** Create invoice (admin) */
router.post("/", requireAdmin, async (req, res) => {
    try {
        await ensureDb();
        const accountId = typeof req.body?.account_id === "string"
            ? req.body.account_id
            : req.user?.accountId ?? "1";
        const createdBy = String(req.user?._id ?? "admin");
        const doc = await invoiceService.createInvoice(String(accountId), req.body, createdBy);
        return res.status(201).json({ ok: true, data: doc });
    }
    catch (err) {
        console.error("admin create invoice err:", err);
        if (String(err.message) === "DB_CONNECT_FAILED")
            return res.status(500).json({ ok: false, error: "db connect failed" });
        return res
            .status(400)
            .json({ ok: false, error: err.message || "bad request" });
    }
});
// replace the existing POST /from-order handler with this block
router.post("/from-order", requireAdmin, async (req, res) => {
    try {
        await ensureDb();
        const { orderId } = req.body;
        // console.log("POST /admin/invoices/from-order called with orderId:", orderId, "typeof:", typeof orderId);
        if (!orderId)
            return res.status(400).json({ ok: false, error: "orderId required" });
        // quick defensive check: if looks like ObjectId but invalid length, return 400
        if (typeof orderId === "string" && orderId.length > 0 && !mongoose.Types.ObjectId.isValid(orderId)) {
            // if it's numeric string or short id, we allow (fallback), but if it's nonsense, return 400
            // log full details for debugging
            console.warn("orderId failed ObjectId.isValid check:", orderId, "length:", orderId.length);
            // don't crash — continue, invoice.service.resolveOrder will try other strategies
        }
        // Import Order model dynamically (safe any)
        const OrderModule = await import("../../models/Order.js");
        const Order = OrderModule?.Order ?? OrderModule?.default ?? OrderModule;
        if (!Order || typeof Order.findById !== "function") {
            console.error("Order model not available in /from-order", Object.keys(OrderModule || {}));
            return res.status(500).json({ ok: false, error: "Order model not available" });
        }
        // Try resolve order without forcing ObjectId cast here — delegate to service
        let order = null;
        // try to use findById only when valid
        if (typeof orderId === "string" && mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findById(orderId).lean();
            // console.log("findById result:", !!order);
        }
        // numeric fallback (if not found yet)
        if (!order) {
            const maybeNum = Number(orderId);
            if (!Number.isNaN(maybeNum)) {
                order = await Order.findOne({ orderId: maybeNum }).lean();
                // console.log("findOne by numeric orderId result:", !!order);
            }
        }
        // string fallback
        if (!order) {
            order = await Order.findOne({ orderId: String(orderId) }).lean();
            console.log("findOne by string orderId result:", !!order);
        }
        if (!order) {
            console.warn("order not found for orderId:", orderId);
            return res.status(404).json({ ok: false, error: "order not found" });
        }
        // Now call service — but wrap with try/catch to surface specific error
        try {
            const invoice = await invoiceService.createInvoiceFromOrder(order, String(req.user?._id ?? "admin"));
            return res.status(201).json({ ok: true, data: invoice });
        }
        catch (svcErr) {
            console.error("invoiceService.createInvoiceFromOrder error:", svcErr && svcErr.stack ? svcErr.stack : svcErr);
            // if this looks like ObjectId cast error, return clear 400
            if (svcErr && typeof svcErr.message === "string" && svcErr.message.includes("input must be")) {
                return res.status(400).json({ ok: false, error: "invalid order id format (service)" });
            }
            return res.status(500).json({ ok: false, error: svcErr?.message || "server error in invoice creation" });
        }
    }
    catch (err) {
        console.error("from-order top-level error:", err && err.stack ? err.stack : err);
        return res.status(500).json({ ok: false, error: "server error" });
    }
});
/** Issue invoice (mark issued) */
router.post("/:id/issue", requireAdmin, async (req, res) => {
    try {
        await ensureDb();
        const id = req.params.id;
        const inv = await InvoiceModel.findByIdAndUpdate(id, { status: "issued" }, { new: true }).lean();
        if (!inv)
            return res.status(404).json({ ok: false, error: "not found" });
        return res.json({ ok: true, data: inv });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: "server error" });
    }
});
/** Generate PDF now (sync) — mark ready */
router.post("/:id/pdf/generate", requireAdmin, async (req, res) => {
    try {
        await ensureDb();
        const id = req.params.id;
        await InvoiceModel.findByIdAndUpdate(id, { pdfStatus: "pending" });
        // If you have an async PDF queue, enqueue here. For now mark ready.
        await InvoiceModel.findByIdAndUpdate(id, { pdfStatus: "ready" });
        return res.json({ ok: true, message: "PDF generation ready" });
    }
    catch (err) {
        console.error("generate pdf err:", err);
        return res
            .status(500)
            .json({ ok: false, error: "PDF generation failed" });
    }
});
/** Serve/Stream PDF (admin only) */
router.get("/:id/pdf", requireAdmin, async (req, res) => {
    try {
        await ensureDb();
        return await streamInvoicePdfById(req.params.id, res);
    }
    catch (err) {
        console.error("serve pdf err:", err);
        if (!res.headersSent)
            return res.status(500).json({ ok: false, error: "server error" });
    }
});
export default router;
