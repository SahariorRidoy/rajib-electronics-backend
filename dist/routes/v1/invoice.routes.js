// src/routes/v1/invoice.routes.ts
import express from "express";
import { InvoiceModel } from "../../models/Invoice.model.js";
import { Order } from "../../models/Order.js";
import * as invoiceService from "../../services/invoice.service.js";
import { requireAdmin } from "../../middlewares/auth.js";
const router = express.Router();
router.post("/from-order", requireAdmin, async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId)
            return res.status(400).json({ ok: false, error: "orderId required" });
        // Fix: Use type assertion for findById()
        const order = await Order.findById(orderId).lean();
        if (!order)
            return res.status(404).json({ ok: false, error: "order not found" });
        const invoice = await invoiceService.createInvoiceFromOrder(order, "ADMIN");
        return res.status(201).json({ ok: true, data: invoice });
    }
    catch (err) {
        console.error("from-order error:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});
router.get("/by-order/:orderId", async (req, res) => {
    try {
        const { orderId } = req.params;
        const inv = await InvoiceModel.findOne({ orderId }).lean();
        if (!inv)
            return res.status(404).json({ ok: false, error: "No invoice found" });
        return res.status(200).json({ ok: true, data: inv });
    }
    catch (err) {
        console.error("by-order error:", err);
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});
router.get("/guest/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const inv = await invoiceService.findInvoiceByGuestToken(token);
        if (!inv)
            return res.status(404).json({ ok: false, error: "No invoice found" });
        return res.status(200).json({ ok: true, data: inv });
    }
    catch (err) {
        console.error("guest token error:", err);
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});
export default router;
