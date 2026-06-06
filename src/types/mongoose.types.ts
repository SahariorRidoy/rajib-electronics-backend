// src/types/mongoose.types.ts
import { Document, Model, Types } from "mongoose";

export interface IOrder {
  status: "PENDING" | "IN_PROGRESS" | "IN_SHIPPING" | "DELIVERED" | "CANCELLED";
  lines: Array<{
    productId: Types.ObjectId;
    qty: number;
    price?: number;
    image?: string;
    title?: string;
  }>;
  notes: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    area?: string;
    houseOrVillage?: string;
    roadOrPostOffice?: string;
    blockOrThana?: string;
    district?: string;
  };
  totals?: {
    subTotal: number;
    shipping: number;
    tax?: number;
    discount?: number;
    grandTotal: number;
  };
  payment?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderDocument extends IOrder, Document {}
export interface IOrderModel extends Model<IOrderDocument> {}
