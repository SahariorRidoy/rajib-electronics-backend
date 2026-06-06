import { Product } from "../../models/Product.js";
import { PromoCard } from "../../models/PromoCard.js";
import express from "express";
import { z } from "zod";
const router = express.Router();
/** Create promo - (Admin) POST /api/promocard */
router.post("/", async (req, res, next) => {
    try {
        // If you have auth middleware, add it: ensure admin
        const schema = z.object({
            title: z.string().min(1),
            categoryId: z.string().min(1),
            image: z.string().optional(),
            slug: z.string().optional(),
            active: z.boolean().optional(),
            priority: z.number().optional(),
        });
        const body = schema.parse(req.body);
        const promo = await PromoCard.create({
            title: body.title,
            category: body.categoryId,
            image: body.image || "",
            slug: body.slug,
            active: body.active ?? true,
            priority: body.priority ?? 0,
        });
        return res.status(201).json(promo);
    }
    catch (err) {
        next(err);
    }
});
/** Get products for a promocard */
router.get("/:id/products", async (req, res, next) => {
    try {
        const parsed = z
            .object({
            id: z.string().min(1),
            query: z
                .object({
                limit: z.coerce.number().optional(),
                skip: z.coerce.number().optional(),
            })
                .optional(),
        })
            .parse({ id: req.params.id, query: req.query });
        const promo = await PromoCard.findById(parsed.id)
            .where({ active: true })
            .populate("category")
            .lean();
        if (!promo)
            return res.status(404).json({ message: "PromoCard not found" });
        const limit = Number(req.query.limit || 24);
        const skip = Number(req.query.skip || 0);
        const products = await Product.find({ category: promo.category._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        return res.json({ promo, category: promo.category, products });
    }
    catch (err) {
        next(err);
    }
});
/** optional: list all promos */
router.get("/", async (req, res, next) => {
    try {
        const promos = await PromoCard.find().sort({ priority: -1 }).lean();
        return res.json(promos);
    }
    catch (err) {
        next(err);
    }
});
export default router;
