import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface StockMovementDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  type: "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN" | "DAMAGE" | "TRANSFER";
  quantity: number; // positive for inbound, negative for outbound
  reason?: string;
  reference?: string; // order ID, purchase order, etc.
  performedBy: mongoose.Types.ObjectId; // admin user ID
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<StockMovementDoc>(
  {
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
  },
  { timestamps: true }
);

StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });

export const StockMovement =
  (models.StockMovement as mongoose.Model<StockMovementDoc>) ||
  model<StockMovementDoc>("StockMovement", StockMovementSchema);