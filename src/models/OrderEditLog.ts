import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface OrderEditLogDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  before: {
    lines: Array<{ productId: string; qty: number; title: string; price: number; image?: string; color?: string }>;
    totals: { subTotal: number; shipping: number; grandTotal: number };
  };
  after: {
    lines: Array<{ productId: string; qty: number; title: string; price: number; image?: string; color?: string }>;
    totals: { subTotal: number; shipping: number; grandTotal: number };
  };
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema(
  {
    productId: { type: String, required: true },
    qty: { type: Number, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: "" },
    color: { type: String, default: "" },
  },
  { _id: false }
);

const totalsSchema = new Schema(
  {
    subTotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderEditLogSchema = new Schema<OrderEditLogDoc>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    before: {
      lines: { type: [lineSchema], required: true },
      totals: { type: totalsSchema, required: true },
    },
    after: {
      lines: { type: [lineSchema], required: true },
      totals: { type: totalsSchema, required: true },
    },
  },
  { timestamps: true }
);

OrderEditLogSchema.index({ orderId: 1, createdAt: -1 });

export const OrderEditLog =
  (models.OrderEditLog as mongoose.Model<OrderEditLogDoc>) ||
  model<OrderEditLogDoc>("OrderEditLog", OrderEditLogSchema);
