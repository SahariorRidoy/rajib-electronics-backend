import mongoose, { Schema } from "mongoose";
const OrderSchema = new Schema({
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, default: "" },
    },
    lines: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            qty: { type: Number, required: true, min: 1 },
            title: { type: String, required: true },
            price: { type: Number, required: true, min: 0 },
            image: { type: String, default: "" },
            color: { type: String, default: "" },
        },
    ],
    totals: {
        subTotal: { type: Number, required: true, min: 0 },
        shipping: { type: Number, required: true, min: 0 },
        grandTotal: { type: Number, required: true, min: 0 },
    },
    status: {
        type: String,
        enum: ["PENDING", "IN_PROGRESS", "IN_SHIPPING", "DELIVERED", "CANCELLED", "RETURNED"],
        default: "PENDING",
    },
    payment: {
        method: { type: String, required: true },
        status: { type: String, required: true },
        transactionId: { type: String, default: "" },
        invoiceNumber: { type: String, default: "" },
        paidAmount: { type: Number, default: 0 },
        paidAt: { type: Date },
        payerMobile: { type: String, default: "" },
    },
    notes: { type: String, default: "" },
    adminNotes: [
        {
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        },
    ],
    deliveryZone: { type: String, enum: ["inside", "outside"], default: "outside" },
    idempotencyKey: { type: String, index: { unique: true, sparse: true } },
    deliveryChargePaid: { type: Boolean, default: false },
    courier: {
        provider: { type: String, enum: ["steadfast", "pathao"] },
        consignmentId: { type: String },
        trackingCode: { type: String },
        status: { type: String },
        sentAt: { type: Date },
    },
}, { timestamps: true });
export const Order = mongoose.model("Order", OrderSchema);
