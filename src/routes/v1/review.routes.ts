import { Router, Request, Response } from "express";
import { Review } from "../../models/Review.js";
import { dbConnect } from "../../db/connection.js";

const router = Router();

// GET /api/v1/reviews/:productSlug — fetch active reviews
router.get("/reviews/:productSlug", async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const limit = Math.min(Number(req.query.limit) || 5, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter = { productSlug: req.params.productSlug, status: "active" };
    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Review.countDocuments(filter),
    ]);
    res.json({ ok: true, data: reviews, total, page, limit, hasMore: page * limit < total });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to fetch reviews" });
  }
});

// POST /api/v1/reviews/:productSlug — submit a review (pending by default)
router.post("/reviews/:productSlug", async (req: Request, res: Response) => {
  try {
    await dbConnect();
    const { name, message, rating } = req.body;
    if (!name?.trim() || !message?.trim() || !rating) {
      res.status(400).json({ ok: false, message: "name, message and rating are required" });
      return;
    }
    const r = Number(rating);
    if (r < 1 || r > 5) {
      res.status(400).json({ ok: false, message: "Rating must be 1–5" });
      return;
    }
    const review = await Review.create({
      productSlug: req.params.productSlug,
      name: name.trim(),
      image: typeof req.body.image === "string" ? req.body.image.trim() : "",
      message: message.trim(),
      rating: r,
      status: "pending",
    });
    res.status(201).json({ ok: true, data: review });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to submit review" });
  }
});

export default router;
