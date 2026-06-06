import { Schema, model } from "mongoose";
const InvoiceItemSchema = new Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    taxPercent: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
}, { _id: false });
const InvoiceSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, index: true, required: false }, // new
    accountId: { type: Schema.Types.ObjectId, index: true, required: false },
    invoiceNumber: { type: String, unique: true, required: true },
    guestToken: { type: String, index: true, unique: true, sparse: true }, // new
    customerContact: {
        name: String,
        email: String,
        phone: String,
    },
    items: { type: [InvoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["draft", "issued", "paid", "cancelled"],
        default: "draft",
    },
    pdfUrl: String,
    pdfStatus: {
        type: String,
        enum: ["none", "pending", "ready", "error"],
        default: "none",
    },
    createdBy: { type: Schema.Types.ObjectId, required: false },
}, { timestamps: true });
export const InvoiceModel = model("Invoice", InvoiceSchema);
