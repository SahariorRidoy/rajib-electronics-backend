import { Router } from "express";
import mongoose from "mongoose";
import { dbConnect } from "../../db/connection.js";
import { requireAdmin } from "../../middlewares/auth.js";
import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { Customer } from "../../models/Customer.js";
import { DeliverySettings } from "../../models/DeliverySettings.js";

const router = Router();

/**
 * POST /api/v1/admin/orders
 * Admin creates a manual order (for customers who order via phone/in-person).
 * Body: { customer: { name, phone, address }, items: [{ productId, qty }], deliveryZone: "inside" | "outside" }
 */
router.post("/orders", requireAdmin, async (req, res) => {
  try {
    await dbConnect();

    const { customer, items, deliveryZone } = req.body;

    // Validate required fields
    if (!customer?.name || !customer?.phone || !customer?.address) {
      return res.status(400).json({ ok: false, message: "Customer name, phone, and address are required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "At least one item is required" });
    }
    if (!["inside", "outside"].includes(deliveryZone)) {
      return res.status(400).json({ ok: false, message: "deliveryZone must be 'inside' or 'outside'" });
    }

    // Fetch delivery charges
    const deliverySettings = await DeliverySettings.findOne({ isActive: true }).lean();
    const shippingCharge =
      deliveryZone === "inside"
        ? (deliverySettings?.insideDhakaCharge ?? 60)
        : (deliverySettings?.outsideDhakaCharge ?? 120);

    // Process each item: validate, fetch product, deduct stock
    const orderLines = [];
    for (const item of items) {
      const qty = Math.max(1, Number(item.qty ?? 1));
      if (!item.productId) {
        return res.status(400).json({ ok: false, message: "Each item must have a productId" });
      }

      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      );

      if (!updated) {
        const product = await Product.findById(item.productId).lean();
        if (!product) {
          return res.status(404).json({ ok: false, message: `Product not found: ${item.productId}` });
        }
        return res.status(409).json({
          ok: false,
          message: `Insufficient stock for "${product.title}"`,
          available: product.stock ?? 0,
          requested: qty,
        });
      }

      orderLines.push({
        productId: new mongoose.Types.ObjectId(String(item.productId)),
        qty,
        title: updated.title,
        price: updated.price,
        image: updated.image || updated.images?.[0] || "",
        color: "",
      });
    }

    const subTotal = orderLines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const grandTotal = subTotal + shippingCharge;

    // Auto-create customer record if not exists
    try {
      const exists = await Customer.findOne({ phone: customer.phone });
      if (!exists) {
        await Customer.create({
          name: customer.name,
          email: `auto_${customer.phone}_${Date.now()}@customer.local`,
          phone: customer.phone,
          passwordHash: "AUTO_CREATED_NO_LOGIN",
          isAutoCreated: true,
          address: customer.address,
        });
      }
    } catch (_) {
      // non-critical — continue even if customer record creation fails
    }

    const order = await Order.create({
      customer: { name: customer.name, phone: customer.phone, address: customer.address },
      lines: orderLines,
      totals: { subTotal, shipping: shippingCharge, grandTotal },
      status: "PENDING",
      payment: { method: "CASH_ON_DELIVERY", status: "PENDING" },
      deliveryZone,
      notes: req.body.notes ?? "",
    });

    // Fire notification (non-blocking)
    try {
      const { NotificationService } = await import("../../services/notification.service.js");
      await NotificationService.createOrderNotification(String(order._id), customer.name, grandTotal);
    } catch (_) {}

    return res.status(201).json({
      ok: true,
      message: "Order created successfully",
      orderId: order._id,
      totals: { subTotal, shipping: shippingCharge, grandTotal },
    });
  } catch (err) {
    console.error("POST /admin/orders error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: String(err) });
  }
});

export default router;
