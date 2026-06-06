import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const CustomerSchema = new Schema({
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
}, { timestamps: true });
export const Customer = models.Customer ||
    model("Customer", CustomerSchema);
