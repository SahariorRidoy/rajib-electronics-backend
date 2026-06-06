import { Router } from "express";
import mongoose from "mongoose";
import { dbConnect } from "../../db/connection.js";
import { Subcategory } from "../../models/Subcategory.js";
const router = Router();
const { Types } = mongoose;
router.get("/subcategories", async (req, res, next) => {
    try {
        await dbConnect();
        const { categoryId, status = "ACTIVE" } = req.query;
        const filter = { status };
        if (categoryId && Types.ObjectId.isValid(categoryId)) {
            filter.categoryId = new Types.ObjectId(categoryId);
        }
        const subcategories = await Subcategory.find(filter).populate("categoryId", "name slug").lean();
        return res.json({ ok: true, data: subcategories });
    }
    catch (err) {
        next(err);
    }
});
router.get("/subcategories/:slug", async (req, res, next) => {
    try {
        await dbConnect();
        const { slug } = req.params;
        const subcategory = await Subcategory.findOne({ slug, status: "ACTIVE" }).populate("categoryId", "name slug").lean();
        if (!subcategory)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        return res.json({ ok: true, data: subcategory });
    }
    catch (err) {
        next(err);
    }
});
export default router;
