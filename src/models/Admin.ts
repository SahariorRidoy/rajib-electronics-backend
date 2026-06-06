import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface AdminDoc extends mongoose.Document {
  email: string;
  passwordHash: string;
  role: "ADMIN";
  refreshToken?: string;
  resetOTP?: string;
  resetOTPExpiry?: Date;
}

const AdminSchema = new Schema<AdminDoc>(
  {
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN"], default: "ADMIN" },
    refreshToken: { type: String },
    resetOTP: { type: String },
    resetOTPExpiry: { type: Date },
  },
  { timestamps: true }
);

export const Admin =
  (models.Admin as mongoose.Model<AdminDoc>) ||
  model<AdminDoc>("Admin", AdminSchema);
