import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";
import { Order } from "../../models/Order.js";
import {
  steadfastCreateConsignment,
  steadfastBulkCreate,
  steadfastTrackByConsignment,
  steadfastTrackByInvoice,
  steadfastTrackByTracking,
  steadfastBalance,
  steadfastCreateReturnRequest,
  steadfastGetReturnRequest,
  steadfastGetReturnRequests,
  steadfastGetPayments,
  steadfastGetPayment,
  steadfastGetPoliceStations,
} from "../../services/steadfast.service.js";
import {
  pathaoCreateOrder,
  pathaoCreateBulkOrders,
  pathaoTrack,
  pathaoCancelOrder,
  pathaoGetCities,
  pathaoGetZones,
  pathaoGetAreas,
  pathaoGetStores,
  pathaoCreateStore,
  pathaoGetPriceplan,
} from "../../services/pathao.service.js";

const router = Router();
router.use(requireAdmin);

// ─── STEADFAST ────────────────────────────────────────────────────────────────

router.get("/courier/steadfast/balance", async (req, res, next) => {
  try {
    const data = await steadfastBalance();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.post("/courier/steadfast/send/:orderId", async (req, res, next) => {
  try {
    await dbConnect();
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false, code: "ORDER_NOT_FOUND" });
    if (order.courier?.consignmentId) {
      return res.status(400).json({ ok: false, code: "ALREADY_SENT", data: order.courier });
    }

    let result: Record<string, unknown>;
    try {
      result = await steadfastCreateConsignment({
        invoice: `${order._id.toString()}-${Date.now()}`,
        recipient_name: order.customer.name,
        recipient_phone: order.customer.phone,
        recipient_address: order.customer.address || "N/A",
        cod_amount: order.totals.grandTotal,
        note: order.notes,
      });
    } catch (fetchErr) {
      return res.status(502).json({
        ok: false,
        code: "STEADFAST_UNREACHABLE",
        message: String(fetchErr),
      });
    }

    if (!result || result.status !== 200) {
      return res.status(400).json({
        ok: false,
        message: (result?.message as string) ?? "Steadfast rejected the order",
        data: result,
      });
    }

    const c = result.consignment as Record<string, unknown>;
    order.courier = {
      provider: "steadfast",
      consignmentId: String(c.consignment_id),
      trackingCode: c.tracking_code as string,
      status: c.status as string,
      sentAt: new Date(),
    };
    order.status = "IN_SHIPPING";
    await order.save();

    res.json({ ok: true, data: c });
  } catch (err) {
    next(err);
  }
});

router.post("/courier/steadfast/bulk-send", async (req, res, next) => {
  try {
    await dbConnect();
    const { orderIds } = z.object({ orderIds: z.array(z.string()) }).parse(req.body);

    const orders = await Order.find({ _id: { $in: orderIds }, "courier.consignmentId": { $exists: false } });
    if (!orders.length) return res.status(400).json({ ok: false, code: "NO_ELIGIBLE_ORDERS" });

    const payload = orders.map((o) => ({
      invoice: o._id.toString(),
      recipient_name: o.customer.name,
      recipient_phone: o.customer.phone,
      recipient_address: o.customer.address || "N/A",
      cod_amount: o.totals.grandTotal,
      note: o.notes,
    }));

    const result = await steadfastBulkCreate(payload);

    // docs: result is a direct array of consignment objects
    const resultArray = Array.isArray(result) ? result : (result?.data ?? []);
    for (const item of resultArray) {
      const order = orders.find((o) => o._id.toString() === String(item.invoice));
      if (order && item.consignment_id && item.status !== "error") {
        order.courier = {
          provider: "steadfast",
          consignmentId: String(item.consignment_id),
          trackingCode: item.tracking_code,
          status: item.status,
          sentAt: new Date(),
        };
        order.status = "IN_SHIPPING";
        await order.save();
      }
    }

    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/steadfast/track/:orderId", async (req, res, next) => {
  try {
    await dbConnect();
    const order = await Order.findById(req.params.orderId).lean();
    if (!order?.courier?.consignmentId) {
      return res.status(404).json({ ok: false, code: "NO_CONSIGNMENT" });
    }
    const data = await steadfastTrackByConsignment(order.courier.consignmentId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/steadfast/track-invoice/:orderId", async (req, res, next) => {
  try {
    await dbConnect();
    const order = await Order.findById(req.params.orderId).lean();
    if (!order) return res.status(404).json({ ok: false, code: "ORDER_NOT_FOUND" });
    const data = await steadfastTrackByInvoice(order._id.toString());
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Track by tracking code
router.get("/courier/steadfast/track-code/:trackingCode", async (req, res, next) => {
  try {
    const data = await steadfastTrackByTracking(req.params.trackingCode);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Return requests
router.post("/courier/steadfast/return", async (req, res, next) => {
  try {
    const body = z.object({
      consignment_id: z.union([z.string(), z.number()]).optional(),
      invoice: z.string().optional(),
      tracking_code: z.string().optional(),
      reason: z.string().optional(),
    }).parse(req.body);
    if (!body.consignment_id && !body.invoice && !body.tracking_code) {
      return res.status(400).json({ ok: false, code: "IDENTIFIER_REQUIRED" });
    }
    const data = await steadfastCreateReturnRequest(body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/steadfast/return/:id", async (req, res, next) => {
  try {
    const data = await steadfastGetReturnRequest(req.params.id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/steadfast/returns", async (req, res, next) => {
  try {
    const data = await steadfastGetReturnRequests();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Payments
router.get("/courier/steadfast/payments", async (req, res, next) => {
  try {
    const data = await steadfastGetPayments();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/steadfast/payments/:paymentId", async (req, res, next) => {
  try {
    const data = await steadfastGetPayment(req.params.paymentId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Police stations
router.get("/courier/steadfast/police-stations", async (req, res, next) => {
  try {
    const data = await steadfastGetPoliceStations();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── PATHAO ───────────────────────────────────────────────────────────────────

router.get("/courier/pathao/stores", async (req, res, next) => {
  try {
    const result = await pathaoGetStores();
    // Pathao: { data: { data: [...stores] } }
    const stores = result?.data?.data ?? result?.data ?? [];
    res.json({ ok: true, data: stores });
  } catch (err) {
    next(err);
  }
});

router.post("/courier/pathao/stores", async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(3).max(50),
      contact_name: z.string().min(3).max(50),
      contact_number: z.string().length(11),
      secondary_contact: z.string().length(11).optional(),
      otp_number: z.string().optional(),
      address: z.string().min(15).max(120),
      city_id: z.number().int().positive(),
      zone_id: z.number().int().positive(),
      area_id: z.number().int().positive(),
    }).parse(req.body);
    const data = await pathaoCreateStore({
      name: body.name as string,
      contact_name: body.contact_name as string,
      contact_number: body.contact_number as string,
      secondary_contact: body.secondary_contact,
      otp_number: body.otp_number,
      address: body.address as string,
      city_id: body.city_id as number,
      zone_id: body.zone_id as number,
      area_id: body.area_id as number,
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/pathao/cities", async (req, res, next) => {
  try {
    const result = await pathaoGetCities();
    // Pathao: { data: { data: [...cities] } }
    const cities = result?.data?.data ?? result?.data ?? [];
    res.json({ ok: true, data: cities });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/pathao/zones/:cityId", async (req, res, next) => {
  try {
    const result = await pathaoGetZones(Number(req.params.cityId));
    // Pathao: { data: { data: [...zones] } }
    const zones = result?.data?.data ?? result?.data ?? [];
    res.json({ ok: true, data: zones });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/pathao/areas/:zoneId", async (req, res, next) => {
  try {
    const result = await pathaoGetAreas(Number(req.params.zoneId));
    // Pathao: { data: { data: [...areas] } }
    const areas = result?.data?.data ?? result?.data ?? [];
    res.json({ ok: true, data: areas });
  } catch (err) {
    next(err);
  }
});

router.post("/courier/pathao/price-plan", async (req, res, next) => {
  try {
    const body = z.object({
      store_id: z.number().int().positive(),
      item_type: z.number().int().default(2),
      delivery_type: z.number().int().default(48),
      item_weight: z.number().positive().default(0.5),
      recipient_city: z.number().int().positive(),
      recipient_zone: z.number().int().positive(),
    }).parse(req.body);
    const data = await pathaoGetPriceplan({
      store_id: body.store_id as number,
      item_type: body.item_type as number,
      delivery_type: body.delivery_type as number,
      item_weight: body.item_weight as number,
      recipient_city: body.recipient_city as number,
      recipient_zone: body.recipient_zone as number,
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

const PathaoSendSchema = z.object({
  store_id: z.number().int().positive(),
  recipient_city: z.number().int().positive().optional(),
  recipient_zone: z.number().int().positive().optional(),
  recipient_area: z.number().int().positive().optional(),
  delivery_type: z.number().int().default(48),
  item_type: z.number().int().default(2),
  item_weight: z.number().positive().default(0.5),
  special_instruction: z.string().optional(),
  item_description: z.string().optional(),
});

router.post("/courier/pathao/send/:orderId", async (req, res, next) => {
  try {
    await dbConnect();
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false, code: "ORDER_NOT_FOUND" });
    if (order.courier?.consignmentId) {
      return res.status(400).json({ ok: false, code: "ALREADY_SENT", data: order.courier });
    }

    const body = PathaoSendSchema.parse(req.body);

    const result = await pathaoCreateOrder({
      store_id: body.store_id as number,
      recipient_city: body.recipient_city,
      recipient_zone: body.recipient_zone,
      recipient_area: body.recipient_area,
      delivery_type: body.delivery_type as number,
      item_type: body.item_type as number,
      item_weight: String(body.item_weight ?? 0.5),
      special_instruction: body.special_instruction,
      item_description: body.item_description,
      merchant_order_id: order._id.toString(),
      recipient_name: order.customer.name,
      recipient_phone: order.customer.phone,
      recipient_address: order.customer.address || "N/A",
      item_quantity: order.lines.reduce((s, l) => s + l.qty, 0),
      amount_to_collect: order.totals.grandTotal,
    });

    if (!result?.data?.consignment_id) {
      return res.status(400).json({ ok: false, data: result });
    }

    order.courier = {
      provider: "pathao",
      consignmentId: String(result.data.consignment_id),
      trackingCode: String(result.data.consignment_id),
      status: result.data.order_status,
      sentAt: new Date(),
    };
    order.status = "IN_SHIPPING";
    await order.save();

    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get("/courier/pathao/track/:orderId", async (req, res, next) => {
  try {
    await dbConnect();
    const order = await Order.findById(req.params.orderId).lean();
    if (!order?.courier?.consignmentId) {
      return res.status(404).json({ ok: false, code: "NO_CONSIGNMENT" });
    }
    const data = await pathaoTrack(order.courier.consignmentId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Pathao bulk send — POST /aladdin/api/v1/orders/bulk
router.post("/courier/pathao/bulk-send", async (req, res, next) => {
  try {
    await dbConnect();
    const { orders: orderPayloads } = z.object({
      orders: z.array(z.object({
        orderId: z.string(),
        store_id: z.number().int().positive(),
        delivery_type: z.number().int().default(48),
        item_type: z.number().int().default(2),
        item_weight: z.number().positive().default(0.5),
        special_instruction: z.string().optional(),
        item_description: z.string().optional(),
      })),
    }).parse(req.body);

    const dbOrders = await Order.find({
      _id: { $in: orderPayloads.map((o) => o.orderId) },
      "courier.consignmentId": { $exists: false },
    });

    if (!dbOrders.length) return res.status(400).json({ ok: false, code: "NO_ELIGIBLE_ORDERS" });

    const bulkPayload = dbOrders.map((o) => {
      const p = orderPayloads.find((x) => x.orderId === o._id.toString())!;
      return {
        store_id: p.store_id,
        merchant_order_id: o._id.toString(),
        recipient_name: o.customer.name,
        recipient_phone: o.customer.phone,
        recipient_address: o.customer.address || "N/A",
        delivery_type: p.delivery_type as number,
        item_type: p.item_type as number,
        item_weight: String(p.item_weight ?? 0.5),
        item_quantity: o.lines.reduce((s, l) => s + l.qty, 0),
        amount_to_collect: o.totals.grandTotal,
        special_instruction: p.special_instruction,
        item_description: p.item_description,
      };
    });

    const result = await pathaoCreateBulkOrders(bulkPayload);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/courier/pathao/cancel/:orderId", async (req, res, next) => {
  try {
    await dbConnect();
    const order = await Order.findById(req.params.orderId);
    if (!order?.courier?.consignmentId) {
      return res.status(404).json({ ok: false, code: "NO_CONSIGNMENT" });
    }
    if (order.courier.provider !== "pathao") {
      return res.status(400).json({ ok: false, code: "NOT_PATHAO_ORDER" });
    }
    const data = await pathaoCancelOrder(order.courier.consignmentId);
    order.courier.status = "Cancelled";
    await order.save();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── SHARED ───────────────────────────────────────────────────────────────────

// Get courier info for any order
router.get("/courier/order/:orderId", async (req, res, next) => {
  try {
    await dbConnect();
    const order = await Order.findById(req.params.orderId).select("courier status customer totals").lean();
    if (!order) return res.status(404).json({ ok: false, code: "ORDER_NOT_FOUND" });
    res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
});

// List all orders with courier info
router.get("/courier/shipments", async (req, res, next) => {
  try {
    await dbConnect();
    const { provider, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { "courier.consignmentId": { $exists: true } };
    if (provider) filter["courier.provider"] = provider;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ "courier.sentAt": -1 }).skip(skip).limit(Number(limit)).select("courier status customer totals lines").lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ ok: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
});

export default router;
