// src/models/banner.model.ts
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const BannerSchema = new Schema({
    image: { type: String, required: true },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    discount: { type: String, default: "" },
    position: { type: String, enum: ["hero", "side"], default: "hero" },
    status: { type: String, enum: ["ACTIVE", "HIDDEN"], default: "ACTIVE" },
    sort: { type: Number, default: 0 },
    link: { type: String, default: "" },
    categorySlug: { type: String, index: true, default: null },
}, { timestamps: true });
BannerSchema.index({ position: 1, categorySlug: 1, status: 1 });
// export typed model
export const Banner = models.Banner ||
    model("Banner", BannerSchema);
export default Banner;
