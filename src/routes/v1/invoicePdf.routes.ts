// src/routes/v1/invoicePdf.routes.ts
import express from "express";
import { streamInvoicePdfById } from "../../services/invoicePdf.service.js";
import { requireAdmin } from "../../middlewares/auth.js";

const router = express.Router();

/**
 * GET /api/v1/invoices/pdf/:invoiceId
 */
router.get("/invoices/pdf/:invoiceId", requireAdmin, async (req, res) => {
  // ✅ "invoices/pdf" path
  try {
    const { invoiceId } = req.params;
    // console.log("📄 PDF generation requested for:", invoiceId);
    await streamInvoicePdfById(invoiceId, res);
  } catch (error: any) {
    console.error("PDF generation error:", error);
    res.status(500).json({ ok: false, error: "PDF generation failed" });
  }
});

export default router;
