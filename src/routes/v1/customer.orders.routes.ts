// src/routes/v1/customer.orders.routes.ts
import { Router } from "express";
import { z } from "zod";
import { dbConnect } from "../../db/connection.js";
import { Order } from "../../models/Order.js";
import type { IOrderDocument } from "../../types/mongoose.types.js";

const router = Router();

const OrderListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  phone: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.get("/customer/orders", async (req, res) => {
  try {
    await dbConnect();

    const parsed = OrderListQuery.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          ok: false,
          message: "Invalid query",
          errors: parsed.error.format(),
        });
    }
    const q = parsed.data;

    if (!q.phone) {
      return res.json({
        ok: true,
        data: { items: [], total: 0, page: q.page, limit: q.limit, pages: 0 },
      });
    }

    const filter: Record<string, any> = { "customer.phone": q.phone };

    // Add date filtering
    if (q.startDate || q.endDate) {
      filter.createdAt = {};
      if (q.startDate) {
        filter.createdAt.$gte = new Date(q.startDate);
      }
      if (q.endDate) {
        const end = new Date(q.endDate);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }

    const items = await (Order as any)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean();

    const total = await (Order as any).countDocuments(filter);

    const formattedItems = items.map((order: IOrderDocument) => ({
      ...order,
      _id: String(order._id),
      customer: order.customer || {},
      lines: Array.isArray(order.lines)
        ? order.lines.map((line) => ({
            ...line,
            productId: line.productId ? String(line.productId) : line.productId,
          }))
        : [],
      totals: order.totals || { subTotal: 0, shipping: 0, grandTotal: 0 },
      status: order.status || "PENDING",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return res.json({
      ok: true,
      data: {
        items: formattedItems,
        total,
        page: q.page,
        limit: q.limit,
        pages: Math.ceil(total / q.limit),
      },
    });
  } catch (e) {
    console.error("GET /customer/orders error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/** PATCH /customer/orders/:id/address — customer can only edit their delivery address */
router.patch("/customer/orders/:id/address", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;
    const { phone, address } = req.body;

    if (!phone || !address?.trim()) {
      return res.status(400).json({ ok: false, message: "Phone and address are required" });
    }

    const order = await (Order as any).findById(id).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    // Verify the order belongs to this phone number
    if (order.customer?.phone !== phone) {
      return res.status(403).json({ ok: false, message: "Unauthorized" });
    }

    if (["DELIVERED", "CANCELLED", "RETURNED"].includes(order.status)) {
      return res.status(400).json({ ok: false, message: "Cannot edit a completed order" });
    }

    const updated = await (Order as any).findByIdAndUpdate(
      id,
      { "customer.address": address.trim() },
      { new: true }
    ).lean();

    return res.json({
      ok: true,
      data: {
        ...updated,
        _id: String(updated._id),
        lines: updated.lines.map((l: any) => ({ ...l, productId: String(l.productId) })),
      },
    });
  } catch (e) {
    console.error("PATCH /customer/orders/:id/address error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;