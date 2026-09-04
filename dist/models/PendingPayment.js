import mongoose, { Schema } from "mongoose";
const PendingPaymentSchema = new Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    orderPayload: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });
// Auto-delete after 2 hours if payment never completes
PendingPaymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });
export const PendingPayment = mongoose.model("PendingPayment", PendingPaymentSchema);
