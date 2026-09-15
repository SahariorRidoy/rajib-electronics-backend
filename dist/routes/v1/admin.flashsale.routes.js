import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import requireAdmin from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";
import { FlashSale } from "../../models/FlashSale.js";
import { Product } from "../../models/Product.js";
const router = Router();
// ── Zod schemas ──────────────────────────────────────────────────────────────
const FlashSaleItemDTO = z.object({
    productId: z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid productId"),
    salePrice: z.number().nonnegative(),
    saleQty: z.number().int().positive(),
});
const CreateFlashSaleDTO = z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    items: z.array(FlashSaleItemDTO).min(1),
});
const UpdateFlashSaleDTO = CreateFlashSaleDTO.partial().refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });
const IdParam = z.object({
    id: z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid ObjectId"),
});
// ── Helper: compute status from time ─────────────────────────────────────────
function computeStatus(doc) {
    if (doc.status === "PAUSED")
        return "PAUSED";
    const now = new Date();
    if (now < doc.startAt)
        return "SCHEDULED";
    if (now > doc.endAt)
        return "ENDED";
    return "ACTIVE";
}
function formatSale(sale) {
    return {
        ...sale,
        _id: String(sale._id),
        status: computeStatus(sale),
        items: (sale.items ?? []).map((item) => ({
            ...item,
            productId: String(item.productId),
        })),
    };
}
// ── GET /admin/flash-sales ────────────────────────────────────────────────────
router.get("/flash-sales", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const sales = await FlashSale.find().sort({ startAt: -1 }).lean();
        // Enrich all items with product title + price
        const allProductIds = [...new Set(sales.flatMap((s) => s.items.map((i) => i.productId)))];
        const products = await Product.find({ _id: { $in: allProductIds } })
            .select("_id title price images image")
            .lean();
        const productMap = new Map(products.map((p) => [String(p._id), p]));
        const enriched = sales.map((sale) => ({
            ...formatSale(sale),
            items: sale.items.map((item) => {
                const p = productMap.get(String(item.productId));
                return {
                    productId: String(item.productId),
                    title: p?.title ?? "",
                    image: p?.images?.[0] ?? p?.image ?? "",
                    regularPrice: p?.price ?? 0,
                    salePrice: item.salePrice,
                    saleQty: item.saleQty,
                    soldQty: item.soldQty,
                };
            }),
        }));
        return res.json({ ok: true, data: enriched });
    }
    catch (err) {
        next(err);
    }
});
// ── GET /admin/flash-sales/:id ────────────────────────────────────────────────
router.get("/flash-sales/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const sale = await FlashSale.findById(id).lean();
        if (!sale)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        return res.json({ ok: true, data: formatSale(sale) });
    }
    catch (err) {
        next(err);
    }
});
// ── POST /admin/flash-sales ───────────────────────────────────────────────────
router.post("/flash-sales", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const body = CreateFlashSaleDTO.parse(req.body);
        const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
        if (body.endAt <= body.startAt) {
            return res.status(400).json({ ok: false, code: "INVALID_DATES", message: "endAt must be after startAt" });
        }
        // Prevent same product in two overlapping active/scheduled sales
        const productIds = body.items.map((i) => new mongoose.Types.ObjectId(i.productId));
        const overlap = await FlashSale.findOne({
            status: { $ne: "ENDED" },
            "items.productId": { $in: productIds },
            startAt: { $lt: body.endAt },
            endAt: { $gt: body.startAt },
        }).lean();
        if (overlap) {
            return res.status(409).json({
                ok: false,
                code: "PRODUCT_OVERLAP",
                message: "One or more products are already in an overlapping flash sale",
            });
        }
        const sale = await FlashSale.create({
            ...body,
            slug,
            items: body.items.map((i) => ({
                ...i,
                productId: new mongoose.Types.ObjectId(i.productId),
                soldQty: 0,
            })),
        });
        return res.status(201).json({ ok: true, data: formatSale(sale.toObject()) });
    }
    catch (err) {
        next(err);
    }
});
// ── PATCH /admin/flash-sales/:id ─────────────────────────────────────────────
router.patch("/flash-sales/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const body = UpdateFlashSaleDTO.parse(req.body);
        if (body.startAt && body.endAt && body.endAt <= body.startAt) {
            return res.status(400).json({ ok: false, code: "INVALID_DATES", message: "endAt must be after startAt" });
        }
        const update = { ...body };
        if (body.items) {
            update.items = body.items.map((i) => ({
                ...i,
                productId: new mongoose.Types.ObjectId(i.productId),
                soldQty: 0,
            }));
        }
        const updated = await FlashSale.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
        if (!updated)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        return res.json({ ok: true, data: formatSale(updated) });
    }
    catch (err) {
        next(err);
    }
});
// ── PATCH /admin/flash-sales/:id/pause ───────────────────────────────────────
router.patch("/flash-sales/:id/pause", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const sale = await FlashSale.findById(id);
        if (!sale)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        const current = computeStatus(sale);
        if (current === "ENDED") {
            return res.status(400).json({ ok: false, code: "ALREADY_ENDED" });
        }
        // Toggle: PAUSED → restore natural status, anything else → PAUSED
        sale.status = sale.status === "PAUSED" ? computeStatus({ ...sale.toObject(), status: "SCHEDULED" }) : "PAUSED";
        await sale.save();
        return res.json({ ok: true, data: formatSale(sale.toObject()) });
    }
    catch (err) {
        next(err);
    }
});
// ── DELETE /admin/flash-sales/:id ────────────────────────────────────────────
router.delete("/flash-sales/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const deleted = await FlashSale.findByIdAndDelete(id).lean();
        if (!deleted)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        return res.json({ ok: true, data: { id } });
    }
    catch (err) {
        next(err);
    }
});
// ── GET /admin/flash-sales/:id/stats ─────────────────────────────────────────
router.get("/flash-sales/:id/stats", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const sale = await FlashSale.findById(id).lean();
        if (!sale)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        const productIds = sale.items.map((i) => i.productId);
        const products = await Product.find({ _id: { $in: productIds } })
            .select("_id title image images price")
            .lean();
        const productMap = new Map(products.map((p) => [String(p._id), p]));
        const itemStats = sale.items.map((item) => {
            const p = productMap.get(String(item.productId));
            return {
                productId: String(item.productId),
                title: p?.title ?? "Unknown",
                image: p?.images?.[0] ?? p?.image ?? "",
                regularPrice: p?.price ?? 0,
                salePrice: item.salePrice,
                saleQty: item.saleQty,
                soldQty: item.soldQty,
                remaining: item.saleQty - item.soldQty,
                revenue: item.salePrice * item.soldQty,
            };
        });
        const totalRevenue = itemStats.reduce((s, i) => s + i.revenue, 0);
        const totalSold = itemStats.reduce((s, i) => s + i.soldQty, 0);
        return res.json({
            ok: true,
            data: {
                sale: formatSale(sale),
                totalRevenue,
                totalSold,
                items: itemStats,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
export default router;
