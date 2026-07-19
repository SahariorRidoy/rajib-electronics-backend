import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const ReviewSchema = new Schema({
    productSlug: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    message: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    status: { type: String, enum: ["pending", "active", "inactive"], default: "pending", index: true },
}, { timestamps: true });
export const Review = models.Review ||
    model("Review", ReviewSchema);
