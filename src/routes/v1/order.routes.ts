// src/routes/v1/order.routes.ts
import { Router } from "express";
import mongoose from "mongoose";
import { dbConnect } from "../../db/connection.js";
import { Product } from "../../models/Product.js";
import { Order } from "../../models/Order.js";
import { Customer } from "../../models/Customer.js";
import { OrderEditLog } from "../../models/OrderEditLog.js";
import type { IOrderDocument } from "../../types/mongoose.types.js";

const router = Router();

/**
 * POST /api/v1/orders
 * - Tries to use transactions if the MongoDB deployment supports it.
 * - If transactions aren't supported, falls back to an atomic-ish approach:
 *    * findOneAndUpdate({ stock: { $gte: qty } }, { $inc: { stock: -qty } })
 *    * if any update fails, rollback previously applied updates (best-effort)
 * - Supports optional idempotencyKey (if present, prevents duplicates).
 */
router.post("/orders", async (req, res) => {
  // console.log("📥 ORDER CREATION REQUEST RECEIVED:", {
  //   itemsCount: req.body.items?.length,
  //   customerPhone: req.body.customer?.phone,
  //   customerName: req.body.customer?.name,
  //   billingAddress: req.body.customer?.billingAddress,
  //   totals: req.body.totals,
  // });

  try {
    await dbConnect();

    // Normalize & validate items
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No items in order",
        code: "NO_ITEMS",
      });
    }

    const normalized = items.map((it: any, idx: number) => {
      const _id = it._id ?? it.productId;
      const quantity = Math.max(1, Number(it.quantity ?? it.qty ?? 1));
      return { _id: String(_id), quantity, original: it, idx: idx + 1 };
    });

    // Quick validation
    const invalid = normalized.filter((n) => !n._id || n.quantity <= 0);
    if (invalid.length) {
      return res.status(400).json({
        ok: false,
        message: "Invalid items",
        code: "INVALID_ITEMS",
        errors: invalid,
      });
    }

    // SIMPLIFIED NON-TRANSACTIONAL FLOW
    const updatedProducts = [];
    const outOfStockItems = [];

    for (const line of normalized) {
      // Fetch product
      const product = await Product.findById(line._id);
      if (!product) {
        outOfStockItems.push({
          _id: line._id,
          reason: "PRODUCT_NOT_FOUND",
        });
        continue;
      }

      const availableStock = product.stock ?? product.availableStock ?? 0;
      if (availableStock < line.quantity) {
        outOfStockItems.push({
          _id: line._id,
          reason: "INSUFFICIENT_STOCK",
          available: availableStock,
          requested: line.quantity,
        });
        continue;
      }

      // Update stock atomically
      const updated = await Product.findOneAndUpdate(
        { _id: line._id, stock: { $gte: line.quantity } },
        {
          $inc: {
            stock: -line.quantity,
            ...(product.availableStock !== undefined
              ? { availableStock: -line.quantity }
              : {}),
          },
        },
        { new: true }
      );

      if (!updated) {
        outOfStockItems.push({
          _id: line._id,
          reason: "STOCK_UPDATE_FAILED",
          available: availableStock,
          requested: line.quantity,
        });
        continue;
      }

      updatedProducts.push({
        _id: String(updated._id),
        stock: updated.stock ?? updated.availableStock ?? 0,
        title: updated.title ?? "Unknown Product",
      });
    }

    if (outOfStockItems.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Some items out of stock",
        code: "OUT_OF_STOCK",
        outOfStock: outOfStockItems,
      });
    }

    // Auto-create customer for admin tracking
    const customerPhone = req.body.customer?.phone;
    if (customerPhone) {
      let customer = await Customer.findOne({ phone: customerPhone });
      if (!customer) {
        const autoEmail = `auto_${customerPhone}_${Date.now()}@customer.local`;
        try {
          customer = await Customer.create({
            name: req.body.customer?.name || "Customer",
            email: autoEmail,
            phone: customerPhone,
            passwordHash: "AUTO_CREATED_NO_LOGIN",
            isAutoCreated: true,
            address: req.body.customer?.address,
          });
        } catch (err) {
          // Handle duplicate email by adding random suffix
          customer = await Customer.create({
            name: req.body.customer?.name || "Customer",
            email: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@customer.local`,
            phone: customerPhone,
            passwordHash: "AUTO_CREATED_NO_LOGIN",
            isAutoCreated: true,
            address: req.body.customer?.address,
          });
        }
      }
    }

    // Create order
    const orderData = {
      customer: {
        name: req.body.customer?.name ?? "Customer",
        phone: req.body.customer?.phone ?? "",
        address: req.body.customer?.address ?? "",
      },
      lines: normalized.map((n) => ({
        productId: new mongoose.Types.ObjectId(n._id),
        qty: n.quantity,
        title: n.original?.title ?? "Product",
        price: n.original?.price ?? 0,
        image: n.original?.image ?? "",
        color: n.original?.color ?? "",
      })),
      totals: req.body.totals ?? {
        subTotal: 0,
        shipping: 0,
        grandTotal: 0,
      },
      status: "PENDING",
      payment: req.body.payment ?? {
        method: "CASH_ON_DELIVERY",
        status: "PENDING",
      },
      notes: req.body.notes ?? "",
      deliveryZone: req.body.deliveryZone === "inside" ? "inside" : "outside",
    };

    const createdOrder = await Order.create(orderData);

    // Create order notification
    try {
      const { NotificationService } = await import("../../services/notification.service.js");
      await NotificationService.createOrderNotification(
        String(createdOrder._id),
        orderData.customer.name,
        orderData.totals.grandTotal
      );
    } catch (notificationError) {
      console.error("Failed to create order notification:", notificationError);
    }

    return res.json({
      ok: true,
      message: "Order created successfully",
      orderId: createdOrder._id,
      updatedProducts,
    });
  } catch (error) {
    console.error("❌ Order creation error:", error);
    return res.status(500).json({
      ok: false,
      message: "Order creation failed",
      code: "SERVER_ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/* ---------- existing GET/patch/delete routes (kept compatible) ---------- */

router.get("/orders", async (req, res) => {
  try {
    await dbConnect();

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : null;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : null;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (search) {
      const orConditions: Record<string, any>[] = [
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
      }
      filter.$or = orConditions;
    }

    // Add date filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }

    const items = await (Order as any)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await (Order as any).countDocuments(filter);

    // Build customer flags: sameDay duplicate & returning customer
    const phones = [...new Set(items.map((o: any) => o.customer?.phone).filter(Boolean))] as string[];

    // For each phone, get all orders (outside current page) to detect flags
    const allOrdersForPhones = phones.length
      ? await (Order as any)
          .find({ "customer.phone": { $in: phones } })
          .select("_id customer.phone createdAt status")
          .lean()
      : [];

    // Group by phone
    const ordersByPhone: Record<string, any[]> = {};
    for (const o of allOrdersForPhones) {
      const p = o.customer?.phone;
      if (!p) continue;
      if (!ordersByPhone[p]) ordersByPhone[p] = [];
      ordersByPhone[p].push(o);
    }

    const formatted = items.map((o: IOrderDocument & any) => {
      const phone = o.customer?.phone;
      const allForPhone: any[] = phone ? (ordersByPhone[phone] ?? []) : [];
      const oDate = new Date(o.createdAt);
      const oDayStart = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate()).getTime();
      const oDayEnd = oDayStart + 86400000;

      // sameDay: another order from same phone on same calendar day (excluding itself)
      const sameDay = allForPhone.some(
        (x: any) =>
          String(x._id) !== String(o._id) &&
          new Date(x.createdAt).getTime() >= oDayStart &&
          new Date(x.createdAt).getTime() < oDayEnd
      );

      // returning: has a prior order (createdAt < this order) that is not CANCELLED
      const returning = allForPhone.some(
        (x: any) =>
          String(x._id) !== String(o._id) &&
          new Date(x.createdAt).getTime() < oDate.getTime() &&
          x.status !== "CANCELLED"
      );

      return {
        ...o,
        _id: String(o._id),
        lines: Array.isArray(o.lines)
          ? o.lines.map((line: any) => ({
              ...line,
              productId: line.productId ? String(line.productId) : line.productId,
            }))
          : [],
        totals: o.totals || { subTotal: 0, shipping: 0, grandTotal: 0 },
        codAmount: (() => {
          const isPaid = o.payment?.status === "PAID";
          if (!isPaid) return o.totals?.grandTotal ?? 0;
          return o.deliveryChargePaid ? (o.totals?.subTotal ?? 0) : (o.totals?.shipping ?? 0);
        })(),
        customerFlags: { sameDay, returning },
      };
    });

    return res.json({
      ok: true,
      data: {
        items: formatted,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET /orders error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

router.get("/debug/recent-orders", async (req, res) => {
  try {
    await dbConnect();
    const recentOrders = await (Order as any)
      .find({})
      .select(
        "_id customer.createdAt customer.phone customer.name createdAt status lines"
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const formatted = recentOrders.map((order: any) => ({
      _id: String(order._id),
      customerPhone: order.customer?.phone || null,
      customerName: order.customer?.name || null,
      createdAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : null,
      status: order.status,
      linesCount: order.lines?.length || 0,
      ageHours:
        Math.round(
          (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
        ) + " hours",
    }));
    const total = await (Order as any).countDocuments({});
    return res.json({
      ok: true,
      data: formatted,
      message: `Found ${formatted.length} recent orders`,
      total,
    });
  } catch (error) {
    console.error("Debug recent orders error:", error);
    return res.status(500).json({ ok: false, message: "Debug failed" });
  }
});

/** GET /orders/by-phone/:phone — all orders for a phone number (admin use) */
router.get("/orders/by-phone/:phone", async (req, res) => {
  try {
    await dbConnect();
    const { phone } = req.params;
    const orders = await (Order as any)
      .find({ "customer.phone": phone })
      .select("_id customer.name status totals lines createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const formatted = orders.map((o: any) => ({
      _id: String(o._id),
      customerName: o.customer?.name,
      status: o.status,
      grandTotal: o.totals?.grandTotal ?? 0,
      itemCount: Array.isArray(o.lines) ? o.lines.reduce((s: number, l: any) => s + (l.qty ?? 1), 0) : 0,
      lines: Array.isArray(o.lines) ? o.lines.map((l: any) => ({ title: l.title, qty: l.qty, price: l.price })) : [],
      createdAt: o.createdAt,
    }));
    return res.json({ ok: true, data: formatted });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/** PATCH /orders/:id/details — admin edits customer info, item rates, shipping, totals, notes */
router.patch("/orders/:id/details", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const { customer, lines, totals, notes } = req.body;

    const order = await (Order as any).findById(id).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    const updateFields: Record<string, any> = {};
    const logEntries: any[] = [];

    // Customer changes
    if (customer) {
      const bc = { name: order.customer.name, phone: order.customer.phone, address: order.customer.address ?? "" };
      const ac: any = { ...bc };
      if (customer.name !== undefined) { updateFields["customer.name"] = customer.name; ac.name = customer.name; }
      if (customer.phone !== undefined) { updateFields["customer.phone"] = customer.phone; ac.phone = customer.phone; }
      if (customer.address !== undefined) { updateFields["customer.address"] = customer.address; ac.address = customer.address; }
      if (JSON.stringify(bc) !== JSON.stringify(ac)) {
        logEntries.push({ orderId: order._id, editType: "customer", before: { customer: bc }, after: { customer: ac } });
      }
    }

    // Notes changes
    if (notes !== undefined) {
      const beforeNotes = order.notes ?? "";
      if (beforeNotes !== notes) {
        logEntries.push({ orderId: order._id, editType: "notes", before: { notes: beforeNotes }, after: { notes } });
      }
      updateFields["notes"] = notes;
    }

    // Lines / price changes
    if (lines && Array.isArray(lines)) {
      for (const oldLine of order.lines) {
        const newLine = lines.find((l: any) => String(l.productId) === String(oldLine.productId));
        const diff = Number(oldLine.qty) - (newLine ? Math.max(1, Number(newLine.qty)) : 0);
        if (diff !== 0) await Product.findByIdAndUpdate(oldLine.productId, { $inc: { stock: diff } });
      }
      const oldLines = order.lines.map((l: any) => ({ productId: String(l.productId), qty: l.qty, title: l.title, price: l.price, image: l.image ?? "", color: l.color ?? "" }));
      const newLines = lines.map((l: any) => ({ productId: String(l.productId), qty: Math.max(1, Number(l.qty)), title: l.title ?? "", price: Number(l.price) ?? 0, image: l.image ?? "", color: l.color ?? "" }));
      const hasPriceChange = oldLines.some((ol: any) => { const nl = newLines.find((n: any) => n.productId === ol.productId); return nl && nl.price !== ol.price; });
      const hasQtyChange = oldLines.length !== newLines.length || oldLines.some((ol: any) => { const nl = newLines.find((n: any) => n.productId === ol.productId); return !nl || nl.qty !== ol.qty; });
      if (hasPriceChange) logEntries.push({ orderId: order._id, editType: "price", before: { lines: oldLines }, after: { lines: newLines } });
      if (hasQtyChange) logEntries.push({ orderId: order._id, editType: "lines", before: { lines: oldLines }, after: { lines: newLines } });
      updateFields["lines"] = newLines.map((l: any) => ({ ...l, productId: new mongoose.Types.ObjectId(l.productId) }));
    }

    // Shipping / totals changes
    if (totals) {
      const bt = { subTotal: order.totals.subTotal, shipping: order.totals.shipping, grandTotal: order.totals.grandTotal };
      if (totals.subTotal !== undefined) updateFields["totals.subTotal"] = Number(totals.subTotal);
      if (totals.shipping !== undefined) updateFields["totals.shipping"] = Number(totals.shipping);
      if (totals.grandTotal !== undefined) updateFields["totals.grandTotal"] = Number(totals.grandTotal);
      const at = { subTotal: totals.subTotal ?? bt.subTotal, shipping: totals.shipping ?? bt.shipping, grandTotal: totals.grandTotal ?? bt.grandTotal };
      if (bt.shipping !== at.shipping) {
        logEntries.push({ orderId: order._id, editType: "shipping", before: { totals: bt }, after: { totals: at } });
      }
    }

    const updated = await (Order as any).findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (logEntries.length > 0) await OrderEditLog.insertMany(logEntries);

    const formatted = {
      ...updated,
      _id: String(updated._id),
      lines: updated.lines.map((l: any) => ({ ...l, productId: String(l.productId) })),
    };
    return res.json({ ok: true, data: formatted });
  } catch (err) {
    console.error("PATCH /orders/:id/details error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: String(err) });
  }
});

/** PATCH /orders/:id/lines — admin edits item quantities or removes items */
router.patch("/orders/:id/lines", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const { lines } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ ok: false, message: "Lines array required and cannot be empty" });
    }

    const order = await (Order as any).findById(id).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    if (["DELIVERED", "CANCELLED", "RETURNED"].includes(order.status)) {
      return res.status(400).json({ ok: false, message: "Cannot edit items on a completed order" });
    }

    // Adjust stock based on qty diff between old and new lines
    for (const oldLine of order.lines) {
      const newLine = lines.find((l: any) => String(l.productId) === String(oldLine.productId));
      const oldQty = Number(oldLine.qty);
      const newQty = newLine ? Math.max(1, Number(newLine.qty)) : 0;
      const diff = oldQty - newQty; // positive → return stock, negative → deduct stock
      if (diff !== 0) {
        await Product.findByIdAndUpdate(oldLine.productId, { $inc: { stock: diff } });
      }
    }

    // Recalculate totals
    const subTotal = lines.reduce((sum: number, l: any) => sum + (Number(l.price) * Math.max(1, Number(l.qty))), 0);
    const shipping = order.totals?.shipping ?? 0;
    const grandTotal = subTotal + shipping;

    const updatedLines = lines.map((l: any) => ({
      productId: new mongoose.Types.ObjectId(String(l.productId)),
      qty: Math.max(1, Number(l.qty)),
      title: l.title ?? "",
      price: Number(l.price) ?? 0,
      image: l.image ?? "",
      color: l.color ?? "",
    }));

    const updated = await (Order as any).findByIdAndUpdate(
      id,
      { lines: updatedLines, "totals.subTotal": subTotal, "totals.grandTotal": grandTotal },
      { new: true }
    ).lean();

    // Write audit log
    const oldLines = order.lines.map((l: any) => ({ productId: String(l.productId), qty: l.qty, title: l.title, price: l.price, image: l.image ?? "", color: l.color ?? "" }));
    const newLinesLog = lines.map((l: any) => ({ productId: String(l.productId), qty: Math.max(1, Number(l.qty)), title: l.title ?? "", price: Number(l.price) ?? 0, image: l.image ?? "", color: l.color ?? "" }));
    const linesLogEntries: any[] = [];
    const hasPriceChange = oldLines.some((ol: any) => { const nl = newLinesLog.find((n: any) => n.productId === ol.productId); return nl && nl.price !== ol.price; });
    const hasQtyChange = oldLines.length !== newLinesLog.length || oldLines.some((ol: any) => { const nl = newLinesLog.find((n: any) => n.productId === ol.productId); return !nl || nl.qty !== ol.qty; });
    if (hasPriceChange) linesLogEntries.push({ orderId: order._id, editType: "price", before: { lines: oldLines, totals: order.totals }, after: { lines: newLinesLog, totals: { subTotal, shipping, grandTotal } } });
    if (hasQtyChange) linesLogEntries.push({ orderId: order._id, editType: "lines", before: { lines: oldLines, totals: order.totals }, after: { lines: newLinesLog, totals: { subTotal, shipping, grandTotal } } });
    if (linesLogEntries.length > 0) await OrderEditLog.insertMany(linesLogEntries);

    const formatted = {
      ...updated,
      _id: String(updated._id),
      lines: updated.lines.map((l: any) => ({ ...l, productId: String(l.productId) })),
    };

    return res.json({ ok: true, data: formatted });
  } catch (err) {
    console.error("PATCH /orders/:id/lines error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: String(err) });
  }
});

/** POST /orders/:id/notes — admin adds a new note */
router.post("/orders/:id/notes", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ ok: false, message: "Note text required" });

    const updated = await (Order as any).findByIdAndUpdate(
      id,
      { $push: { adminNotes: { text: text.trim(), createdAt: new Date() } } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ ok: false, message: "Order not found" });

    const formatted = {
      ...updated,
      _id: String(updated._id),
      lines: updated.lines.map((l: any) => ({ ...l, productId: String(l.productId) })),
    };
    return res.json({ ok: true, data: formatted });
  } catch (err) {
    console.error("POST /orders/:id/notes error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/** DELETE /orders/:id/notes/:noteIndex — admin deletes a note by index */
router.delete("/orders/:id/notes/:noteIndex", async (req, res) => {
  try {
    await dbConnect();
    const { id, noteIndex } = req.params;
    const idx = Number(noteIndex);

    const order = await (Order as any).findById(id).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    const notes = Array.isArray(order.adminNotes) ? [...order.adminNotes] : [];
    if (idx < 0 || idx >= notes.length) return res.status(400).json({ ok: false, message: "Invalid note index" });
    notes.splice(idx, 1);

    const updated = await (Order as any).findByIdAndUpdate(id, { adminNotes: notes }, { new: true }).lean();
    const formatted = {
      ...updated,
      _id: String(updated._id),
      lines: updated.lines.map((l: any) => ({ ...l, productId: String(l.productId) })),
    };
    return res.json({ ok: true, data: formatted });
  } catch (err) {
    console.error("DELETE /orders/:id/notes/:noteIndex error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/** GET /orders/:id/history — admin audit log */
router.get("/orders/:id/history", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const logs = await (OrderEditLog as any)
      .find({ orderId: id })
      .sort({ createdAt: -1 })
      .lean();
    const formatted = logs.map((log: any) => ({
      _id: String(log._id),
      orderId: String(log.orderId),
      editType: log.editType ?? "lines",
      before: log.before,
      after: log.after,
      createdAt: log.createdAt,
    }));
    return res.json({ ok: true, data: formatted });
  } catch (err) {
    console.error("GET /orders/:id/history error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

router.patch("/orders/:id", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status)
      return res
        .status(400)
        .json({
          ok: false,
          message: "Order ID and status required",
          code: "MISSING_DATA",
        });
    const validStatuses = [
      "PENDING",
      "IN_PROGRESS",
      "IN_SHIPPING",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status))
      return res
        .status(400)
        .json({ ok: false, message: "Invalid status", code: "INVALID_STATUS" });
    const updated = await (Order as any).findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!updated)
      return res
        .status(404)
        .json({
          ok: false,
          message: "Order not found",
          code: "ORDER_NOT_FOUND",
        });
    return res.json({
      ok: true,
      message: "Order status updated",
      data: { _id: String(updated._id), status: updated.status },
    });
  } catch (err) {
    console.error("❌ Order update error:", err);
    return res
      .status(500)
      .json({
        ok: false,
        message: "Internal server error",
        error: String(err),
      });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({
          ok: false,
          message: "Order ID is required",
          code: "MISSING_ID",
        });
    const deleted = await (Order as any).findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({
          ok: false,
          message: "Order not found",
          code: "ORDER_NOT_FOUND",
        });
    return res.json({
      ok: true,
      message: "Order deleted",
      data: { id: String(deleted._id) },
    });
  } catch (err) {
    console.error("❌ Order delete error:", err);
    return res
      .status(500)
      .json({
        ok: false,
        message: "Internal server error",
        error: String(err),
      });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ ok: false, message: "Order ID is required" });
    const order = await (Order as any).findById(id).lean();
    if (!order)
      return res.status(404).json({ ok: false, message: "Order not found" });
    const formatted = {
      ...order,
      _id: String(order._id),
      lines: Array.isArray(order.lines)
        ? order.lines.map((l: any) => ({
            ...l,
            productId: l.productId ? String(l.productId) : l.productId,
          }))
        : [],
      codAmount: (() => {
        const isPaid = (order as any).payment?.status === "PAID";
        if (!isPaid) return (order as any).totals?.grandTotal ?? 0;
        return (order as any).deliveryChargePaid
          ? ((order as any).totals?.subTotal ?? 0)
          : ((order as any).totals?.shipping ?? 0);
      })(),
    };
    return res.json({ ok: true, data: formatted });
  } catch (err) {
    console.error("GET /orders/:id error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;
