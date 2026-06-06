import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const DeliverySettingsSchema = new Schema({
    freeDeliveryThreshold: { type: Number, required: true, default: 1000 },
    deliveryCharge: { type: Number, required: true, default: 50 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
export const DeliverySettings = models.DeliverySettings ||
    model("DeliverySettings", DeliverySettingsSchema);
