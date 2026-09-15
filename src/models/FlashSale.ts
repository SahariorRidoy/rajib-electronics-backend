import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface FlashSaleItem {
  productId: mongoose.Types.ObjectId;
  salePrice: number;
  saleQty: number;
  soldQty: number;
}

export interface FlashSaleDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string; // auto-generated, not user-facing
  description?: string;
  startAt: Date;
  endAt: Date;
  status: "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED";
  items: FlashSaleItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const FlashSaleItemSchema = new Schema<FlashSaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    salePrice: { type: Number, required: true, min: 0 },
    saleQty: { type: Number, required: true, min: 1 },
    soldQty: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const FlashSaleSchema = new Schema<FlashSaleDoc>(
  {
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
  },
  { timestamps: true }
);

FlashSaleSchema.index({ startAt: 1, endAt: 1 });
FlashSaleSchema.index({ status: 1 });
FlashSaleSchema.index({ slug: 1 }, { unique: true });

/** Compute effective status from time (ignores PAUSED — that stays as-is) */
FlashSaleSchema.methods.computedStatus = function (): "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" {
  if (this.status === "PAUSED") return "PAUSED";
  const now = new Date();
  if (now < this.startAt) return "SCHEDULED";
  if (now > this.endAt) return "ENDED";
  return "ACTIVE";
};

export const FlashSale =
  (models.FlashSale as mongoose.Model<FlashSaleDoc>) ||
  model<FlashSaleDoc>("FlashSale", FlashSaleSchema);
