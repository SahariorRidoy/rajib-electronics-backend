// src/services/invoicePdf.service.ts
import PDFDocument from "pdfkit";
import type { Response } from "express";
import mongoose from "mongoose";
import { InvoiceModel } from "../models/Invoice.model.js";

/**
 * Fixed PDF Generator - ASCII only, no font issues
 */

interface CustomerContact {
  name?: string;
  email?: string;
  phone?: string;
}

interface InvoiceItem {
  description?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
  lineTotal?: number;
}

interface Invoice {
  _id?: string;
  invoiceNumber?: string;
  companyName?: string;
  createdAt?: Date | string;
  customerContact?: CustomerContact;
  customerName?: string;
  billingAddress?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  taxTotal?: number;
  discountAmount?: number;
  total?: number;
  notes?: string;
}

// Strict ASCII-only text sanitization
function safeText(s: any, maxLength: number = 200): string {
  if (s === undefined || s === null) return "";
  let str = String(s).trim();

  // Remove ANY non-ASCII characters and control characters
  str = str.replace(/[^\x20-\x7E]/g, "").substring(0, maxLength);

  return str || "N/A";
}

// Simple number formatting - NO CURRENCY SYMBOLS
function formatNumber(n: number | undefined | null): string {
  const num = Number(n ?? 0) || 0;
  return num.toFixed(2);
}

function formatDate(dt: any): string {
  if (!dt) return "N/A";
  try {
    const date = new Date(dt);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

function validateInvoice(invoice: any): invoice is Invoice {
  return invoice && typeof invoice === "object";
}

async function ensureDbConnection(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "");
    }
  } catch (error) {
    console.error("Database connection error:", error);
    throw new Error("Database connection failed");
  }
}

async function fetchInvoice(invoiceId: string): Promise<Invoice | null> {
  let invoice: any = null;

  if (mongoose.Types.ObjectId.isValid(invoiceId)) {
    invoice = await InvoiceModel.findById(invoiceId).lean();
  } else {
    invoice = await InvoiceModel.findOne({ invoiceNumber: invoiceId }).lean();
  }

  if (invoice) {
    return {
      _id: invoice._id?.toString(),
      invoiceNumber: invoice.invoiceNumber,
      companyName: invoice.companyName,
      createdAt: invoice.createdAt,
      customerContact: invoice.customerContact,
      customerName: invoice.customerName,
      billingAddress: invoice.billingAddress,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      discountAmount: invoice.discountAmount,
      total: invoice.total,
      notes: invoice.notes,
    };
  }

  return null;
}

export async function streamInvoicePdfById(
  invoiceId: string,
  res: Response
): Promise<void> {
  if (!invoiceId?.trim()) {
    res.status(400).json({ ok: false, error: "Invoice ID is required" });
    return;
  }

  try {
    await ensureDbConnection();
  } catch (error) {
    res.status(500).json({ ok: false, error: "Database connection failed" });
    return;
  }

  let invoice: Invoice | null = null;
  try {
    invoice = await fetchInvoice(invoiceId);
  } catch (err) {
    console.error("Invoice lookup error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch invoice" });
    return;
  }

  if (!validateInvoice(invoice)) {
    res.status(404).json({ ok: false, error: "Invoice not found" });
    return;
  }

  return streamInvoicePdf(invoice, res);
}

export function streamInvoicePdf(invoice: any, res: Response): void {
  if (!validateInvoice(invoice)) {
    res.status(400).json({ ok: false, error: "Invalid invoice data" });
    return;
  }

  // Safe filename
  const safeInvoiceNum = safeText(
    invoice.invoiceNumber ?? invoice._id ?? "invoice"
  ).replace(/[^a-zA-Z0-9-_]/g, "-");

  const filename = `invoice-${safeInvoiceNum}.pdf`;

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");

  // Create PDF document with SIMPLE settings
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    font: "Helvetica", // Explicitly set font
  });

  // Pipe to response
  doc.pipe(res);

  // Use ONLY Helvetica font - no custom fonts
  const primaryColor = "#000000";
  const secondaryColor = "#666666";
  const borderColor = "#cccccc";

  // Header - SIMPLE TEXT ONLY
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(safeText(invoice.companyName || "COMPANY NAME"), 50, 50);

  doc.font("Helvetica").fontSize(12).text("INVOICE", 50, 80);

  // Invoice info (right side)
  doc
    .fontSize(10)
    .text(`Invoice: ${safeText(invoice.invoiceNumber || "N/A")}`, 400, 50, {
      align: "right",
    })
    .text(`Date: ${formatDate(invoice.createdAt)}`, 400, 65, { align: "right" })
    .text("Status: PAID", 400, 80, { align: "right" });

  // Line separator
  doc
    .moveTo(50, 110)
    .lineTo(550, 110)
    .strokeColor(borderColor)
    .lineWidth(1)
    .stroke();

  // Billing info
  doc.font("Helvetica-Bold").fontSize(10).text("BILL TO:", 50, 130);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      safeText(
        invoice.customerContact?.name || invoice.customerName || "Customer"
      ),
      50,
      145
    );

  if (invoice.customerContact?.email) {
    doc.text(safeText(invoice.customerContact.email), 50, 160);
  }

  if (invoice.customerContact?.phone) {
    doc.text(safeText(invoice.customerContact.phone), 50, 175);
  }

  if (invoice.billingAddress) {
    doc.text(safeText(invoice.billingAddress), 50, 190, { width: 250 });
  }

  // Table header
  const tableTop = 240;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("DESCRIPTION", 50, tableTop)
    .text("QTY", 350, tableTop, { align: "right" })
    .text("UNIT PRICE", 420, tableTop, { align: "right" })
    .text("AMOUNT", 500, tableTop, { align: "right" });

  // Table header line
  doc
    .moveTo(50, tableTop + 12)
    .lineTo(550, tableTop + 12)
    .strokeColor(primaryColor)
    .lineWidth(1)
    .stroke();

  // Table rows - SIMPLE NUMBERS ONLY
  let currentY = tableTop + 25;
  const items: InvoiceItem[] = Array.isArray(invoice.items)
    ? invoice.items
    : [];

  doc.font("Helvetica").fontSize(9);

  if (items.length === 0) {
    doc.text("No items", 50, currentY);
    currentY += 20;
  } else {
    items.forEach((item) => {
      const description = safeText(item.description || item.name || "Item");
      const quantity = Number(item.quantity ?? item.qty ?? 0);
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      const lineTotal = Number(item.lineTotal ?? quantity * unitPrice);

      doc
        .text(description, 50, currentY, { width: 280 })
        .text(quantity.toString(), 350, currentY, { align: "right" })
        .text(formatNumber(unitPrice), 420, currentY, { align: "right" })
        .text(formatNumber(lineTotal), 500, currentY, { align: "right" });

      currentY += 15;
    });
  }

  // Totals - PLAIN NUMBERS ONLY
  const totalsY = Math.max(currentY + 20, 600);

  const subtotal = Number(invoice.subtotal ?? 0);
  const tax = Number(invoice.taxTotal ?? 0);
  const discount = Number(invoice.discountAmount ?? 0);
  const total = Number(invoice.total ?? subtotal + tax - discount);

  // Draw totals section with proper alignment
  doc.font("Helvetica").fontSize(9);

  // Subtotal
  doc
    .text("Subtotal:", 400, totalsY, { align: "right" })
    .text(formatNumber(subtotal), 500, totalsY, { align: "right" });

  // Tax
  doc
    .text("Tax:", 400, totalsY + 15, { align: "right" })
    .text(formatNumber(tax), 500, totalsY + 15, { align: "right" });

  // Discount
  doc
    .text("Discount:", 400, totalsY + 30, { align: "right" })
    .text(formatNumber(discount), 500, totalsY + 30, { align: "right" });

  // Total line
  doc
    .moveTo(400, totalsY + 45)
    .lineTo(550, totalsY + 45)
    .strokeColor(primaryColor)
    .lineWidth(1)
    .stroke();

  // Total amount
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("TOTAL:", 400, totalsY + 50, { align: "right" })
    .text(formatNumber(total), 500, totalsY + 50, { align: "right" });

  // Footer
  const footerY = 750;
  doc
    .font("Helvetica")
    .fontSize(8)
    .text("Thank you for your business!", 50, footerY, { align: "center" });

  // Finalize PDF
  doc.end();
}
