import { Schema, model } from "mongoose";
const InvoiceSequenceSchema = new Schema({
    accountId: { type: String, unique: true, required: true },
    lastSequence: { type: Number, default: 0 },
});
export const InvoiceSequenceModel = model("InvoiceSequence", InvoiceSequenceSchema);
