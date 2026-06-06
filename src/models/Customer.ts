import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface CustomerDoc extends mongoose.Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  isVerified: boolean;
  resetToken?: string;
  resetTokenExpiry?: Date;
  address?: {
    houseOrVillage?: string;
    roadOrPostOffice?: string;
    blockOrThana?: string;
    district?: string;
  };
  isAutoCreated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<CustomerDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, trim: true, index: true },
    passwordHash: { type: String, required: true },
    isVerified: { type: Boolean, default: true },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    address: {
      houseOrVillage: String,
      roadOrPostOffice: String,
      blockOrThana: String,
      district: String,
    },
    isAutoCreated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Customer =
  (models.Customer as mongoose.Model<CustomerDoc>) ||
  model<CustomerDoc>("Customer", CustomerSchema);