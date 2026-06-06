import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const SubcategorySchema = new Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [String], default: [], validate: [arr => arr.length <= 3, "Max 3 images"] },
    description: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "HIDDEN"], default: "ACTIVE" },
}, { timestamps: true });
SubcategorySchema.index({ slug: 1 }, { unique: true });
SubcategorySchema.index({ categoryId: 1, status: 1 });
export const Subcategory = models.Subcategory ||
    model("Subcategory", SubcategorySchema);
