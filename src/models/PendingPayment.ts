import mongoose, { Schema, Document } from "mongoose";

export interface IPendingPayment extends Document {
  invoiceNumber: string;
  orderPayload: any;
  createdAt: Date;
}

const PendingPaymentSchema = new Schema<IPendingPayment>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    orderPayload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// Auto-delete after 2 hours if payment never completes
PendingPaymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

export const PendingPayment = mongoose.model<IPendingPayment>("PendingPayment", PendingPaymentSchema);
