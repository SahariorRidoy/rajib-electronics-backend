import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface DeliverySettingsDoc extends mongoose.Document {
  freeDeliveryThreshold: number;
  insideDhakaCharge: number;
  outsideDhakaCharge: number;
  isActive: boolean;
  deliveryChargePaymentRequired: boolean;
}

const DeliverySettingsSchema = new Schema<DeliverySettingsDoc>(
  {
    freeDeliveryThreshold: { type: Number, required: true, default: 1000 },
    insideDhakaCharge: { type: Number, required: false, default: 60 },
    outsideDhakaCharge: { type: Number, required: false, default: 120 },
    isActive: { type: Boolean, default: true },
    deliveryChargePaymentRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DeliverySettings =
  (models.DeliverySettings as mongoose.Model<DeliverySettingsDoc>) ||
  model<DeliverySettingsDoc>("DeliverySettings", DeliverySettingsSchema);
