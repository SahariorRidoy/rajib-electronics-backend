import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const lineSchema = new Schema({
    productId: { type: String, required: true },
    qty: { type: Number, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: "" },
    color: { type: String, default: "" },
}, { _id: false });
const totalsSchema = new Schema({
    subTotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
}, { _id: false });
const OrderEditLogSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    before: {
        lines: { type: [lineSchema], required: true },
        totals: { type: totalsSchema, required: true },
    },
    after: {
        lines: { type: [lineSchema], required: true },
        totals: { type: totalsSchema, required: true },
    },
}, { timestamps: true });
OrderEditLogSchema.index({ orderId: 1, createdAt: -1 });
export const OrderEditLog = models.OrderEditLog ||
    model("OrderEditLog", OrderEditLogSchema);
