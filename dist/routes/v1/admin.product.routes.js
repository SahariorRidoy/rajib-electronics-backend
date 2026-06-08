import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import requireAdmin from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";
import { Product } from "../../models/Product.js";
import { Manufacturer } from "../../models/Manufacturer.js";
import fs from "fs";
import path from "path";
const router = Router();
const { Types } = mongoose;
const SizeDTO = z
    .object({
    unit: z.enum(["ml", "g", "pcs"]),
    value: z.number().nonnegative(),
})
    .partial(); // optional pair
const ColorVariantDTO = z.object({
    colorName: z.string().min(1),
    colorHex: z.string().optional(),
    image: z.string().url(),
    imageId: z.string().optional(),
});
const VariantDTO = z.object({
    sku: z.string().min(1),
    shade: z.string().optional(),
    colorHex: z.string().optional(),
    size: SizeDTO.optional(),
    price: z.number().nonnegative().optional(),
    compareAtPrice: z.number().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    image: z.string().url().optional(),
    imageId: z.string().optional(), // relative file path e.g. /uploads/variants/uuid.webp
});
const AdminCreateProductDTO = z.object({
    title: z.string().min(2),
    slug: z.string().min(2),
    price: z.number().nonnegative(),
    buyingPrice: z.number().nonnegative().default(0),
    stock: z.number().int().nonnegative().default(0),
    image: z.string().url().optional(),
    images: z.array(z.string().url()).optional(),
    compareAtPrice: z.number().nonnegative().optional(),
    isDiscounted: z.boolean().optional().default(false),
    featured: z.boolean().optional().default(false),
    status: z.enum(["ACTIVE", "DRAFT", "HIDDEN"]).optional().default("ACTIVE"),
    categorySlug: z.string().optional(),
    subcategorySlug: z.string().optional(),
    brand: z.string().optional(),
    manufacturerSlug: z.string().optional(),
    description: z.string().optional(),
    tagSlugs: z.array(z.string()).optional().default([]),
    // ⭐ Cosmetics attributes (all optional)
    shade: z.string().optional(),
    colorHex: z.string().optional(),
    size: SizeDTO.optional(),
    colorVariants: z.array(ColorVariantDTO).optional(),
    variants: z.array(VariantDTO).optional(),
    skinType: z.array(z.string()).optional(),
    hairType: z.array(z.string()).optional(),
    concerns: z.array(z.string()).optional(),
    ingredients: z.array(z.string()).optional(),
    allergens: z.array(z.string()).optional(),
    claims: z.array(z.string()).optional(),
    howToUse: z.string().optional(),
    caution: z.string().optional(),
    benefits: z.array(z.string()).optional(),
    gender: z.enum(["unisex", "female", "male"]).optional(),
    origin: z.string().optional(),
    expiry: z.coerce.date().optional(),
    batchNo: z.string().optional(),
});
const AdminUpdateProductDTO = AdminCreateProductDTO.partial().refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });
const IdParam = z.object({
    id: z.string().refine(Types.ObjectId.isValid, "Invalid ObjectId"),
});
const AdminProductListQuery = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    search: z.string().optional(),
    status: z.enum(["ACTIVE", "DRAFT", "HIDDEN"]).optional(),
    category: z.string().optional(),
    manufacturer: z.string().optional(),
});
router.get("/products", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const query = AdminProductListQuery.parse(req.query);
        const filter = {};
        if (query.search) {
            filter.$or = [
                { title: { $regex: query.search, $options: "i" } },
                { slug: { $regex: query.search, $options: "i" } },
            ];
        }
        if (query.status)
            filter.status = query.status;
        if (query.category)
            filter.categorySlug = query.category;
        if (query.manufacturer)
            filter.manufacturerSlug = query.manufacturer;
        const [items, total] = await Promise.all([
            Product.find(filter)
                .sort({ createdAt: -1 })
                .skip((query.page - 1) * query.limit)
                .limit(query.limit)
                .lean(),
            Product.countDocuments(filter),
        ]);
        return res.json({
            ok: true,
            data: {
                items: items.map((p) => ({ ...p, _id: String(p._id) })),
                total,
                page: query.page,
                limit: query.limit,
                pages: Math.ceil(total / query.limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
router.post("/products", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const body = AdminCreateProductDTO.parse(req.body);
        // Handle manufacturer lookup
        let manufacturerId = null;
        if (body.manufacturerSlug) {
            const manufacturer = await Manufacturer.findOne({
                slug: body.manufacturerSlug,
                status: "ACTIVE"
            });
            if (!manufacturer) {
                return res.status(400).json({
                    ok: false,
                    code: "MANUFACTURER_NOT_FOUND",
                    message: "Manufacturer not found"
                });
            }
            manufacturerId = manufacturer._id;
        }
        // normalize images
        const images = Array.isArray(body.images)
            ? body.images
            : body.image
                ? [body.image]
                : [];
        const created = await Product.create({
            ...body,
            images,
            manufacturer: manufacturerId,
            colorVariants: body.colorVariants ?? [],
        });
        return res.status(201).json({
            ok: true,
            data: { ...created.toObject(), _id: created._id.toString() },
        });
    }
    catch (err) {
        const e = err;
        if (e?.name === "MongoServerError" && e.code === 11000) {
            return res
                .status(409)
                .json({ ok: false, code: "DUPLICATE_KEY", details: e.keyValue });
        }
        next(err);
    }
});
router.patch("/products/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const body = AdminUpdateProductDTO.parse(req.body);
        // Handle manufacturer lookup
        const update = { ...body };
        if (body.manufacturerSlug) {
            const manufacturer = await Manufacturer.findOne({
                slug: body.manufacturerSlug,
                status: "ACTIVE"
            });
            if (!manufacturer) {
                return res.status(400).json({
                    ok: false,
                    code: "MANUFACTURER_NOT_FOUND",
                    message: "Manufacturer not found"
                });
            }
            update.manufacturer = manufacturer._id;
        }
        // normalize images on update too
        if (Array.isArray(body.images)) {
            update.images = body.images;
        }
        else if (body.image) {
            update.images = [body.image];
        }
        // explicitly set colorVariants if provided
        if (Array.isArray(body.colorVariants)) {
            update.colorVariants = body.colorVariants;
        }
        const updated = await Product.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
        if (!updated)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        // Check for stock alerts if stock was updated
        if (body.stock !== undefined) {
            try {
                const { createNotification } = await import("./admin.notification.routes.js");
                if (updated.stock <= 0) {
                    await createNotification("OUT_OF_STOCK", "Out of Stock Alert", `${updated.title} is now out of stock`, String(updated._id));
                }
                else if (updated.stock <= 10) {
                    await createNotification("LOW_STOCK", "Low Stock Alert", `${updated.title} is running low (${updated.stock} left)`, String(updated._id));
                }
            }
            catch (notificationError) {
                console.error("Failed to create stock notification:", notificationError);
            }
        }
        return res.json({
            ok: true,
            data: { ...updated, _id: updated._id.toString() },
        });
    }
    catch (err) {
        next(err);
    }
});
router.delete("/products/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { id } = IdParam.parse(req.params);
        const out = await Product.findByIdAndDelete(id).lean();
        if (!out)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        // Delete color variant + variant images from disk
        const filePathsToDelete = [
            ...(out.colorVariants ?? []).map((v) => v.imageId),
            ...(out.variants ?? []).map((v) => v.imageId),
            ...(out.images ?? []).map((url) => {
                try {
                    return new URL(url).pathname;
                }
                catch {
                    return null;
                }
            }),
        ].filter(Boolean);
        for (const filePath of filePathsToDelete) {
            try {
                const abs = path.join(process.cwd(), filePath);
                if (fs.existsSync(abs))
                    fs.unlinkSync(abs);
            }
            catch { /* ignore */ }
        }
        return res.json({ ok: true, data: { id } });
    }
    catch (err) {
        next(err);
    }
});
export default router;
