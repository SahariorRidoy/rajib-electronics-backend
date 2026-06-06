import { Schema, model, Document } from "mongoose";

export interface IInvoiceSequence extends Document {
  accountId: string;
  lastSequence: number;
}

const InvoiceSequenceSchema = new Schema<IInvoiceSequence>({
  accountId: { type: String, unique: true, required: true },
  lastSequence: { type: Number, default: 0 },
});

export const InvoiceSequenceModel = model<IInvoiceSequence>(
  "InvoiceSequence",
  InvoiceSequenceSchema
);
