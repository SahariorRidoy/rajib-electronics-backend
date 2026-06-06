// src/models/Category.ts
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface CategoryDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  title?: string;
  slug: string;
  images: string[];
  description?: string;
  status: "ACTIVE" | "HIDDEN";
  createdAt?: Date;
  updatedAt?: Date;
}

const CategorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    title: { type: String, default: "" },
    slug: { type: String, required: true, trim: true },
    images: { type: [String], default: [], validate: [arr => arr.length <= 3, "Max 3 images"] },
    description: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "HIDDEN"], default: "ACTIVE" },
  },
  { timestamps: true }
);

// Indexes
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ status: 1 });

export const Category =
  (models.Category as mongoose.Model<CategoryDoc>) ||
  model<CategoryDoc>("Category", CategorySchema);
