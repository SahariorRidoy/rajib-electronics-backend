// models/Idempotency.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const IdempotencySchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    result: { type: Schema.Types.Mixed, default: null }, // store orderId or response payload
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// use existing model if already compiled
const IdempotencyModel =
  mongoose.models?.Idempotency ||
  mongoose.model("Idempotency", IdempotencySchema);

export default IdempotencyModel;
