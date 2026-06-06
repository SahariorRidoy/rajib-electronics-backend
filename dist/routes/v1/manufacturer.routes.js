import { dbConnect } from "../../db/connection.js";
import { Manufacturer } from "../../models/Manufacturer.js";
import { ManufacturerBanner } from "../../models/ManufacturerBanner.js";
import express from "express";
import { z } from "zod";
const router = express.Router();
// GET all active manufacturers (public)
router.get("/", async (req, res, next) => {
    try {
        await dbConnect();
        const manufacturers = await Manufacturer.find({ status: "ACTIVE" })
            .select("name slug image description")
            .lean();
        return res.json({ ok: true, data: manufacturers });
    }
    catch (err) {
        next(err);
    }
});
// GET manufacturer by slug (public)
router.get("/:slug", async (req, res, next) => {
    try {
        await dbConnect();
        const { slug } = req.params;
        const manufacturer = await Manufacturer.findOne({
            slug,
            status: "ACTIVE"
        }).lean();
        if (!manufacturer) {
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        }
        return res.json({ ok: true, data: manufacturer });
    }
    catch (err) {
        next(err);
    }
});
// BANNER ROUTES (keeping existing functionality)
/** Create banner (admin) */
router.post("/banners", async (req, res, next) => {
    try {
        const schema = z.object({
            manufacturerId: z.string().min(1),
            image: z.string().min(1),
            link: z.string().optional(),
            active: z.boolean().optional(),
            order: z.number().optional(),
        });
        const body = schema.parse(req.body);
        const banner = await ManufacturerBanner.create({
            manufacturer: body.manufacturerId,
            image: body.image,
            link: body.link,
            active: body.active ?? true,
            order: body.order ?? 0,
        });
        return res.status(201).json(banner);
    }
    catch (err) {
        next(err);
    }
});
/** list banners */
router.get("/banners", async (req, res, next) => {
    try {
        await dbConnect();
        const banners = await ManufacturerBanner.find({ active: true })
            .sort({ order: 1 })
            .populate("manufacturer")
            .lean();
        return res.json(banners);
    }
    catch (err) {
        next(err);
    }
});
export default router;
