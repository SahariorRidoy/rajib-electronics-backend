import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface ReviewDoc extends mongoose.Document {
  productSlug: string;
  name: string;
  image?: string;
  message: string;
  rating: number;
  status: "pending" | "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
}

const ReviewSchema = new Schema<ReviewDoc>(
  {
    productSlug: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    message: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    status: { type: String, enum: ["pending", "active", "inactive"], default: "pending", index: true },
  },
  { timestamps: true }
);

export const Review =
  (models.Review as mongoose.Model<ReviewDoc>) ||
  model<ReviewDoc>("Review", ReviewSchema);
