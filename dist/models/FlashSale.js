import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const FlashSaleItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    salePrice: { type: Number, required: true, min: 0 },
    saleQty: { type: Number, required: true, min: 1 },
    soldQty: { type: Number, default: 0, min: 0 },
}, { _id: false });
const FlashSaleSchema = new Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    // PAUSED = admin manually paused; otherwise computed from time
    status: {
        type: String,
        enum: ["SCHEDULED", "ACTIVE", "PAUSED", "ENDED"],
        default: "SCHEDULED",
    },
    items: { type: [FlashSaleItemSchema], default: [] },
}, { timestamps: true });
FlashSaleSchema.index({ startAt: 1, endAt: 1 });
FlashSaleSchema.index({ status: 1 });
FlashSaleSchema.index({ slug: 1 }, { unique: true });
/** Compute effective status from time (ignores PAUSED — that stays as-is) */
FlashSaleSchema.methods.computedStatus = function () {
    if (this.status === "PAUSED")
        return "PAUSED";
    const now = new Date();
    if (now < this.startAt)
        return "SCHEDULED";
    if (now > this.endAt)
        return "ENDED";
    return "ACTIVE";
};
export const FlashSale = models.FlashSale ||
    model("FlashSale", FlashSaleSchema);
