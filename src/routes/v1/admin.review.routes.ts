import { Router, Request, Response } from "express";
import { Review } from "../../models/Review.js";
import requireAdmin from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";

const router = Router();

// GET /api/v1/admin/reviews — list all reviews with filters
router.get("/reviews", requireAdmin, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const { status, productSlug, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (productSlug) filter.productSlug = productSlug;

    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Review.countDocuments(filter),
    ]);
    res.json({ ok: true, data: { reviews, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to fetch reviews" });
  }
});

// POST /api/v1/admin/reviews — admin adds a review (active by default)
router.post("/reviews", requireAdmin, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const { productSlug, name, image, message, rating } = req.body;
    if (!productSlug?.trim() || !name?.trim() || !message?.trim() || !rating) {
      res.status(400).json({ ok: false, message: "productSlug, name, message and rating are required" });
      return;
    }
    const r = Number(rating);
    if (r < 1 || r > 5) {
      res.status(400).json({ ok: false, message: "Rating must be 1–5" });
      return;
    }
    const review = await Review.create({
      productSlug: productSlug.trim(),
      name: name.trim(),
      image: image?.trim() || "",
      message: message.trim(),
      rating: r,
      status: "active",
    });
    res.status(201).json({ ok: true, data: review });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to create review" });
  }
});

// PATCH /api/v1/admin/reviews/:id — update status or fields
router.patch("/reviews/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!review) { res.status(404).json({ ok: false, message: "Review not found" }); return; }
    res.json({ ok: true, data: review });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to update review" });
  }
});

// DELETE /api/v1/admin/reviews/:id
router.delete("/reviews/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await dbConnect();
    await Review.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Review deleted" });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to delete review" });
  }
});

export default router;
