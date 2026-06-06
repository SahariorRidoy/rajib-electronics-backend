// src/models/Manufacturer.ts
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const ManufacturerSchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "HIDDEN"], default: "ACTIVE" },
}, { timestamps: true });
// Indexes
ManufacturerSchema.index({ slug: 1 }, { unique: true });
ManufacturerSchema.index({ status: 1 });
export const Manufacturer = models.Manufacturer ||
    model("Manufacturer", ManufacturerSchema);
