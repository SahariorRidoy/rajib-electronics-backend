// src/models/ManufacturerBanner.ts
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface ManufacturerBannerDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  manufacturer: mongoose.Types.ObjectId | { _id: string; name?: string };
  image: string;
  link?: string;
  active?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ManufacturerBannerSchema = new Schema<ManufacturerBannerDoc>(
  {
    manufacturer: {
      type: Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
      index: true,
    },
    image: { type: String, required: true },
    link: { type: String },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 100, index: true },
  },
  { timestamps: true }
);

// index to quickly fetch active banners ordered by 'order'
ManufacturerBannerSchema.index({ active: 1, order: 1, createdAt: -1 });

export const ManufacturerBanner =
  (models.ManufacturerBanner as mongoose.Model<ManufacturerBannerDoc>) ||
  model<ManufacturerBannerDoc>("ManufacturerBanner", ManufacturerBannerSchema);
