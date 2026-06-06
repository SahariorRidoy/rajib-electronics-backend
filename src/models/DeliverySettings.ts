import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface DeliverySettingsDoc extends mongoose.Document {
  freeDeliveryThreshold: number;
  deliveryCharge: number;
  isActive: boolean;
}

const DeliverySettingsSchema = new Schema<DeliverySettingsDoc>(
  {
    freeDeliveryThreshold: { type: Number, required: true, default: 1000 },
    deliveryCharge: { type: Number, required: true, default: 50 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DeliverySettings =
  (models.DeliverySettings as mongoose.Model<DeliverySettingsDoc>) ||
  model<DeliverySettingsDoc>("DeliverySettings", DeliverySettingsSchema);
