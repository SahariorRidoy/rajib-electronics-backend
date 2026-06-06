// src/routes/v1/public/banners.ts
import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { Banner } from "@/models/banner.model.js";
import { z } from "zod";

const router = Router();

const BannerQuery = z.object({
  position: z.enum(["hero", "side"]).optional(),
  status: z.enum(["ACTIVE", "HIDDEN"]).optional().default("ACTIVE"),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  category: z.string().optional(),
});

router.get("/banners", async (req, res) => {
  try {
    await dbConnect();
    // parse & validate query
    const q = BannerQuery.parse(req.query);

    const filter: Record<string, any> = {};
    if (q.position) filter.position = q.position;
    filter.status = q.status ?? "ACTIVE";
    if (q.category) filter.categorySlug = q.category;

    const lim = q.limit ?? 10;

    const docs = await Banner.find(filter)
      .sort({ sort: -1, createdAt: -1 })
      .limit(lim)
      .lean()
      .exec();

    const data = (docs || []).map((b: any) => ({
      _id: String(b._id),
      image: b.image,
      title: b.title,
      subtitle: b.subtitle,
      discount: b.discount,
      position: b.position,
      status: b.status,
      sort: b.sort,
      link: b.link,
      categorySlug: b.categorySlug,
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error("Failed to fetch banners", err);
    // if zod validation error — return 400 with details (optional)
    if (err && typeof err === "object" && (err as any).issues) {
      return res
        .status(400)
        .json({
          ok: false,
          code: "VALIDATION_ERROR",
          issues: (err as any).issues,
        });
    }
    res.status(500).json({ ok: false, message: "Failed to fetch banners" });
  }
});

export default router;
