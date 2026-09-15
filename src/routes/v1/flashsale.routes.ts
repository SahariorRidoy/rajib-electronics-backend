import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { FlashSale } from "../../models/FlashSale.js";
import { Product } from "../../models/Product.js";

const router = Router();

// ── Helper: compute status from time ─────────────────────────────────────────

function computeStatus(
  doc: { status: string; startAt: Date; endAt: Date }
): "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" {
  if (doc.status === "PAUSED") return "PAUSED";
  const now = new Date();
  if (now < doc.startAt) return "SCHEDULED";
  if (now > doc.endAt) return "ENDED";
  return "ACTIVE";
}

// ── Helper: attach product details to sale items ──────────────────────────────

async function enrichSaleItems(items: any[]) {
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    status: "ACTIVE",
  })
    .select("_id title slug image images price compareAtPrice stock")
    .lean();

  const productMap = new Map(products.map((p: any) => [String(p._id), p]));

  return items
    .map((item) => {
      const p = productMap.get(String(item.productId)) as any;
      if (!p) return null; // skip if product deleted or hidden
      return {
        productId: String(item.productId),
        title: p.title,
        slug: p.slug,
        image: p.images?.[0] ?? p.image ?? "",
        regularPrice: p.price,
        salePrice: item.salePrice,
        saleQty: item.saleQty,
        soldQty: item.soldQty,
        remaining: Math.max(0, item.saleQty - item.soldQty),
        stock: p.stock ?? 0,
        discount: p.price > 0
          ? Math.round(((p.price - item.salePrice) / p.price) * 100)
          : 0,
      };
    })
    .filter(Boolean);
}

// ── GET /flash-sales/active ───────────────────────────────────────────────────
// Returns the currently active (not paused) flash sale with product details

router.get("/flash-sales/active", async (req, res, next) => {
  try {
    await dbConnect();
    const now = new Date();

    const sale = await FlashSale.findOne({
      status: { $ne: "PAUSED" },
      startAt: { $lte: now },
      endAt: { $gte: now },
    })
      .sort({ startAt: -1 })
      .lean();

    if (!sale) return res.json({ ok: true, data: null });

    const enrichedItems = await enrichSaleItems(sale.items);

    return res.json({
      ok: true,
      data: {
        _id: String(sale._id),
        title: sale.title,
        slug: sale.slug,
        description: sale.description,
        startAt: sale.startAt,
        endAt: sale.endAt,
        status: "ACTIVE",
        items: enrichedItems,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /flash-sales/upcoming ─────────────────────────────────────────────────
// Returns the next scheduled sale (for "coming soon" countdown teaser)

router.get("/flash-sales/upcoming", async (req, res, next) => {
  try {
    await dbConnect();
    const now = new Date();

    const sale = await FlashSale.findOne({
      status: { $ne: "PAUSED" },
      startAt: { $gt: now },
    })
      .sort({ startAt: 1 })
      .select("_id title slug description startAt endAt")
      .lean();

    if (!sale) return res.json({ ok: true, data: null });

    return res.json({
      ok: true,
      data: {
        _id: String(sale._id),
        title: sale.title,
        slug: sale.slug,
        description: sale.description,
        startAt: sale.startAt,
        endAt: sale.endAt,
        status: "SCHEDULED",
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /flash-sales/:slug ────────────────────────────────────────────────────
// Returns a specific sale by slug (for /flash-sale page)

router.get("/flash-sales/:slug", async (req, res, next) => {
  try {
    await dbConnect();
    const { slug } = req.params;

    const sale = await FlashSale.findOne({ slug }).lean();
    if (!sale) return res.status(404).json({ ok: false, code: "NOT_FOUND" });

    const status = computeStatus(sale);
    const enrichedItems = status !== "SCHEDULED"
      ? await enrichSaleItems(sale.items)
      : [];

    return res.json({
      ok: true,
      data: {
        _id: String(sale._id),
        title: sale.title,
        slug: sale.slug,
        description: sale.description,
        startAt: sale.startAt,
        endAt: sale.endAt,
        status,
        items: enrichedItems,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
