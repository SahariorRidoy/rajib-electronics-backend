import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const AdminSchema = new Schema({
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN"], default: "ADMIN" },
    refreshToken: { type: String },
    resetOTP: { type: String },
    resetOTPExpiry: { type: Date },
}, { timestamps: true });
export const Admin = models.Admin ||
    model("Admin", AdminSchema);
