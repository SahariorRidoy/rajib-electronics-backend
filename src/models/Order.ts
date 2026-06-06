import mongoose, { Schema, Document } from "mongoose";

export interface IOrderDocument extends Document {
  customer: {
    name: string;
    phone: string;
    houseOrVillage?: string;
    roadOrPostOffice?: string;
    blockOrThana?: string;
    district?: string;
  };
  lines: Array<{
    productId: mongoose.Types.ObjectId;
    qty: number;
    title: string;
    price: number;
    image?: string;
    color?: string;
  }>;
  totals: {
    subTotal: number;
    shipping: number;
    grandTotal: number;
  };
  status: "PENDING" | "IN_PROGRESS" | "IN_SHIPPING" | "DELIVERED" | "CANCELLED" | "RETURNED";
  payment: {
    method: string;
    status: string;
    transactionId?: string;
  };
  notes?: string;
  idempotencyKey?: string;
  courier?: {
    provider: "steadfast" | "pathao";
    consignmentId: string;
    trackingCode?: string;
    status?: string;
    sentAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrderDocument>(
  {
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      houseOrVillage: { type: String, default: "" },
      roadOrPostOffice: { type: String, default: "" },
      blockOrThana: { type: String, default: "" },
      district: { type: String, default: "" },
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
    },
    notes: { type: String, default: "" },
    idempotencyKey: { type: String, index: { unique: true, sparse: true } },
    courier: {
      provider: { type: String, enum: ["steadfast", "pathao"] },
      consignmentId: { type: String },
      trackingCode: { type: String },
      status: { type: String },
      sentAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrderDocument>("Order", OrderSchema);
