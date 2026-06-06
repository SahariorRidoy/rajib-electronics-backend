// src/services/invoice.service.ts
import mongoose from "mongoose";
import { InvoiceModel } from "../models/Invoice.model.js";

/**
 * NOTE:
 * - Use `any` for dynamic imports/payloads to avoid TS casting errors caused by mixed module export styles.
 */

/** resolveOrder(orderOrId) */
export async function resolveOrder(orderOrId: any) {
  const OrderModule: any = await import("../models/Order.js");
  const Order: any = OrderModule?.Order ?? OrderModule?.default ?? OrderModule;
  if (!Order || typeof Order.findOne !== "function") {
    throw new Error("Order model not available");
  }

  if (orderOrId && typeof orderOrId === "object" && orderOrId._id) {
    return orderOrId;
  }

  if (typeof orderOrId === "string") {
    if (mongoose.Types.ObjectId.isValid(orderOrId)) {
      const ord = await Order.findById(orderOrId).lean();
      if (ord) return ord;
    }

    const maybeNum = Number(orderOrId);
    if (!Number.isNaN(maybeNum)) {
      const ord = await Order.findOne({ orderId: maybeNum }).lean();
      if (ord) return ord;
    }

    const ord = await Order.findOne({ orderId: String(orderOrId) }).lean();
    if (ord) return ord;

    return null;
  }

  return null;
}

/** createInvoiceFromOrder(orderOrId, createdBy) */
export async function createInvoiceFromOrder(
  orderOrId: any,
  createdBy: any = "admin"
) {
  const order: any = await resolveOrder(orderOrId);
  if (!order) throw new Error("order not found");

  const safeObjectId = (val: any) => {
    if (!val) return undefined;
    try {
      if (mongoose.Types.ObjectId.isValid(String(val))) {
        return new mongoose.Types.ObjectId(String(val));
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  };

  const invoicePayload: Record<string, any> = {
    ...(order.accountId ? { accountId: safeObjectId(order.accountId) } : {}),
    ...(order._id ? { orderId: safeObjectId(order._id) } : {}),
    invoiceNumber: String(order.invoiceNumber ?? `INV-${Date.now()}`),
    customerContact: {
      name:
        order.customer?.name ??
        order.customerName ??
        order.billing?.name ??
        "Customer",
      email:
        order.customer?.email ??
        order.customerEmail ??
        order.billing?.email ??
        undefined,
      phone:
        order.customer?.phone ??
        order.customerPhone ??
        order.billing?.phone ??
        undefined,
    },
    items:
      Array.isArray(order.lines) && order.lines.length
        ? order.lines.map((l: any) => ({
            description: l.title ?? l.name ?? "Item",
            quantity: l.qty ?? l.quantity ?? 1,
            unitPrice: l.price ?? 0,
            lineTotal: (l.price ?? 0) * (l.qty ?? l.quantity ?? 1),
            productId: l.productId ? String(l.productId) : undefined,
          }))
        : [],
    subtotal: order.totals?.subTotal ?? order.subTotal ?? 0,
    taxTotal: order.totals?.tax ?? 0,
    discountAmount: 0,
    total: order.totals?.grandTotal ?? order.grandTotal ?? 0,
    currency: order.currency ?? "BDT",
    status: "draft",
    ...(createdBy ? { createdBy: safeObjectId(createdBy) } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(order.orderId && !mongoose.Types.ObjectId.isValid(String(order.orderId))
      ? { orderRef: String(order.orderId) }
      : {}),
  };

  const created = await InvoiceModel.create(invoicePayload);
  return created.toObject ? created.toObject() : created;
}

/** listInvoices(accountId, limit) */
export async function listInvoices(accountId: any, limit = 200) {
  const filter: Record<string, any> = {};
  if (accountId) {
    if (mongoose.Types.ObjectId.isValid(String(accountId))) {
      filter.accountId = new mongoose.Types.ObjectId(String(accountId));
    } else {
      filter.accountId = String(accountId);
    }
  }
  const items = await InvoiceModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 1000))
    .lean();
  const total = await InvoiceModel.countDocuments(filter);
  return { items, total };
}

/** getInvoice(id) */
export async function getInvoice(id: any) {
  if (!id) return null;
  try {
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      return await InvoiceModel.findById(String(id)).lean();
    }
    const found = await InvoiceModel.findOne({
      $or: [{ invoiceNumber: String(id) }, { _id: String(id) }],
    }).lean();
    return found;
  } catch (e: any) {
    console.warn("getInvoice error:", e?.message ?? e);
    return null;
  }
}

/** createInvoice(accountId, payload, createdBy) */
export async function createInvoice(
  accountId: any,
  payload: any = {},
  createdBy: any = "admin"
) {
  const safeAccountId = mongoose.Types.ObjectId.isValid(String(accountId))
    ? new mongoose.Types.ObjectId(String(accountId))
    : String(accountId);

  const doc: Record<string, any> = {
    ...payload,
    accountId: safeAccountId,
    createdBy: mongoose.Types.ObjectId.isValid(String(createdBy))
      ? new mongoose.Types.ObjectId(String(createdBy))
      : String(createdBy),
    createdAt: payload.createdAt ?? new Date(),
    updatedAt: payload.updatedAt ?? new Date(),
  };

  const created = await InvoiceModel.create(doc);
  return created.toObject ? created.toObject() : created;
}

/** findInvoiceByGuestToken(token) */
export async function findInvoiceByGuestToken(token: any) {
  if (!token) return null;
  try {
    const inv = await InvoiceModel.findOne({
      guestToken: String(token),
    }).lean();
    return inv;
  } catch (e: any) {
    console.warn("findInvoiceByGuestToken error:", e?.message ?? e);
    return null;
  }
}
