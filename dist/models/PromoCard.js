import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const PromoCardSchema = new Schema({
    title: { type: String, required: true, index: true },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    image: { type: String, default: "" },
    slug: { type: String, index: true, sparse: true },
    active: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0, index: true },
}, { timestamps: true });
PromoCardSchema.index({ priority: -1, createdAt: -1 });
export const PromoCard = models.PromoCard ||
    model("PromoCard", PromoCardSchema);
