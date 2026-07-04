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
const totalsSchema = new Schema({ subTotal: { type: Number }, shipping: { type: Number }, grandTotal: { type: Number } }, { _id: false });
const customerSchema = new Schema({ name: { type: String }, phone: { type: String }, address: { type: String } }, { _id: false });
const snapshotSchema = new Schema({
    lines: { type: [lineSchema], default: undefined },
    totals: { type: totalsSchema, default: undefined },
    customer: { type: customerSchema, default: undefined },
    notes: { type: String, default: undefined },
}, { _id: false });
const OrderEditLogSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    editType: { type: String, enum: ["lines", "customer", "shipping", "notes", "price"], required: true },
    before: { type: snapshotSchema, required: true },
    after: { type: snapshotSchema, required: true },
}, { timestamps: true });
OrderEditLogSchema.index({ orderId: 1, createdAt: -1 });
export const OrderEditLog = models.OrderEditLog ||
    model("OrderEditLog", OrderEditLogSchema);
