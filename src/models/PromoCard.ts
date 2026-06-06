
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface PromoCardDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  category:
    | mongoose.Types.ObjectId
    | { _id: string; name?: string; slug?: string };
  image?: string;
  slug?: string;
  active?: boolean;
  priority?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const PromoCardSchema = new Schema<PromoCardDoc>(
  {
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
  },
  { timestamps: true }
);


PromoCardSchema.index({ priority: -1, createdAt: -1 });

export const PromoCard =
  (models.PromoCard as mongoose.Model<PromoCardDoc>) ||
  model<PromoCardDoc>("PromoCard", PromoCardSchema);
