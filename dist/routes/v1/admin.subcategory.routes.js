import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import requireAdmin from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";
import { Subcategory } from "../../models/Subcategory.js";
const router = Router();
const { Types } = mongoose;
const CreateDTO = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    categoryId: z.string().refine(Types.ObjectId.isValid, "Invalid categoryId"),
    images: z.array(z.string().url()).max(3).optional().default([]),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "HIDDEN"]).optional().default("ACTIVE"),
});
const UpdateDTO = CreateDTO.partial();
const IdParam = z.object({
    id: z.string().refine(Types.ObjectId.isValid, "Invalid ObjectId"),
});
router.post("/subcategories", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const body = CreateDTO.parse(req.body);
        const created = await Subcategory.create(body);
        return res.status(201).json({
            ok: true,
            data: { id: created._id.toString(), slug: created.slug },
        });
    }
    catch (err) {
        next(err);
    }
});
router.get("/subcategories", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { categoryId } = req.query;
        const filter = categoryId && Types.ObjectId.isValid(categoryId)
            ? { categoryId: new Types.ObjectId(categoryId) }
            : {};
        const subcategories = await Subcategory.find(filter).populate("categoryId", "name slug").lean();
        return res.json({ ok: true, data: subcategories });
    }
    catch (err) {
        next(err);
    }
});
router.get("/subcategories/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const subcategory = await Subcategory.findById(id).populate("categoryId", "name slug").lean();
        if (!subcategory)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        return res.json({ ok: true, data: subcategory });
    }
    catch (err) {
        next(err);
    }
});
router.patch("/subcategories/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const body = UpdateDTO.parse(req.body);
        const updated = await Subcategory.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).lean();
        if (!updated)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        return res.json({ ok: true, data: { ...updated, _id: updated._id.toString() } });
    }
    catch (err) {
        next(err);
    }
});
router.delete("/subcategories/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const out = await Subcategory.findByIdAndDelete(id).lean();
        if (!out)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        return res.json({ ok: true, data: { id } });
    }
    catch (err) {
        next(err);
    }
});
export default router;
