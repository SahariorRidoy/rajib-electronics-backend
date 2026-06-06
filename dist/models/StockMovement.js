import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const StockMovementSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: {
        type: String,
        enum: ["PURCHASE", "SALE", "ADJUSTMENT", "RETURN", "DAMAGE", "TRANSFER"],
        required: true,
        index: true
    },
    quantity: { type: Number, required: true },
    reason: { type: String },
    reference: { type: String, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });
export const StockMovement = models.StockMovement ||
    model("StockMovement", StockMovementSchema);
