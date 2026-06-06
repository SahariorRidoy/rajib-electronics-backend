// src/models/banner.model.ts
import mongoose, { Document, Model } from "mongoose";

const { Schema, model, models } = mongoose;

export interface BannerDoc extends Document {
  image: string;
  title?: string;
  subtitle?: string;
  discount?: string;
  position?: "hero" | "side";
  status?: "ACTIVE" | "HIDDEN";
  sort?: number;
  link?: string;
  categorySlug?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const BannerSchema = new Schema<BannerDoc>(
  {
    image: { type: String, required: true },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    discount: { type: String, default: "" },
    position: { type: String, enum: ["hero", "side"], default: "hero" },
    status: { type: String, enum: ["ACTIVE", "HIDDEN"], default: "ACTIVE" },
    sort: { type: Number, default: 0 },
    link: { type: String, default: "" },
    categorySlug: { type: String, index: true, default: null },
  },
  { timestamps: true }
);

BannerSchema.index({ position: 1, categorySlug: 1, status: 1 });

// export typed model
export const Banner: Model<BannerDoc> =
  (models.Banner as Model<BannerDoc>) ||
  model<BannerDoc>("Banner", BannerSchema);
export default Banner;
