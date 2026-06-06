// src/models/ManufacturerBanner.ts
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const ManufacturerBannerSchema = new Schema({
    manufacturer: {
        type: Schema.Types.ObjectId,
        ref: "Manufacturer",
        required: true,
        index: true,
    },
    image: { type: String, required: true },
    link: { type: String },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 100, index: true },
}, { timestamps: true });
// index to quickly fetch active banners ordered by 'order'
ManufacturerBannerSchema.index({ active: 1, order: 1, createdAt: -1 });
export const ManufacturerBanner = models.ManufacturerBanner ||
    model("ManufacturerBanner", ManufacturerBannerSchema);
