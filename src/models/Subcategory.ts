import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface SubcategoryDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  categoryId: mongoose.Types.ObjectId;
  images: string[];
  description?: string;
  status: "ACTIVE" | "HIDDEN";
  createdAt?: Date;
  updatedAt?: Date;
}

const SubcategorySchema = new Schema<SubcategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [String], default: [], validate: [arr => arr.length <= 3, "Max 3 images"] },
    description: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "HIDDEN"], default: "ACTIVE" },
  },
  { timestamps: true }
);

SubcategorySchema.index({ slug: 1 }, { unique: true });
SubcategorySchema.index({ categoryId: 1, status: 1 });

export const Subcategory =
  (models.Subcategory as mongoose.Model<SubcategoryDoc>) ||
  model<SubcategoryDoc>("Subcategory", SubcategorySchema);
