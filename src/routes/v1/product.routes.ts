// src/routes/v1/product.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import { dbConnect } from "../../db/connection.js";
import { Product } from "../../models/Product.js";
import { z } from "zod";
import { validateQuery } from "../../middlewares/validate.js";

const router = Router();

const ProductListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(12),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  discounted: z.enum(["true", "false"]).optional(),
  sort: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// escape regex util to avoid special char issues (and ReDoS risks)
function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get(
  "/products",
  validateQuery(ProductListQuery),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbConnect();

      const q = res.locals.query as z.infer<typeof ProductListQuery>;

      const filter: Record<string, any> = { status: "ACTIVE" };

      if (q.category) filter.categorySlug = q.category;
      if (q.subcategory) filter.subcategorySlug = q.subcategory;
      if (q.brand) filter.brand = q.brand;
      if (q.manufacturer) filter.manufacturerSlug = q.manufacturer;

      if (q.tag) {
        if (q.tag !== "trending") {
          filter.tagSlugs = { $in: [q.tag] };
        }
      }

      if (q.discounted === "true") filter.isDiscounted = true;

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

      if (q.q) {
        const safe = escapeRegex(q.q);
        filter.title = { $regex: safe, $options: "i" };
      }

      const page = Math.max(1, Number(q.page || 1));
      const limit = Math.max(1, Math.min(Number(q.limit || 12), 60));

      let sort: Record<string, 1 | -1> | any = { createdAt: -1 };

      if (q.tag === "trending") {
        sort = { salesCount: -1, views: -1, createdAt: -1 } as any;
      } else if (q.sort === "price_asc") {
        sort = { price: 1 } as any;
      } else if (q.sort === "price_desc") {
        sort = { price: -1 } as any;
      }

      const projection =
        "_id title slug image images price buyingPrice compareAtPrice stock availableStock categorySlug subcategorySlug brand manufacturerSlug description status colorVariants createdAt";

      // Run items query and count concurrently to reduce latency
      const [items, total] = await Promise.all([
        Product.find(filter)
          .select(projection)
          .sort(sort as any)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        Product.countDocuments(filter).exec(),
      ]);

      // small public cache hint (optional, tune as needed)
      res.set("Cache-Control", "public, max-age=30, s-maxage=30");

      res.json({
        ok: true,
        data: {
          items: items.map((p: any) => ({ 
            ...p, 
            _id: String(p._id),
            brand: p.brand || null
          })),
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get product by ID
router.get(
  "/products/id/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbConnect();
      const item = await Product.findOne({
        _id: req.params.id,
        status: "ACTIVE",
      })
        .lean()
        .exec();

      if (!item) return res.status(404).json({ ok: false, code: "NOT_FOUND" });

      res.json({ ok: true, data: { ...item, _id: String((item as any)._id) } });
    } catch (error) {
      next(error);
    }
  }
);

// Get product by slug
router.get(
  "/products/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbConnect();
      const item = await Product.findOne({
        slug: req.params.slug,
        status: "ACTIVE",
      })
        .lean()
        .exec();

      if (!item) return res.status(404).json({ ok: false, code: "NOT_FOUND" });

      res.json({ ok: true, data: { ...item, _id: String((item as any)._id) } });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/brands", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await dbConnect();
    const brands = await Product.distinct("brand", { status: "ACTIVE" });
    const filtered = brands.filter((b: any) => b && b !== "");
    res.json({ ok: true, data: filtered.sort() });
  } catch (error) {
    next(error);
  }
});

export default router;
