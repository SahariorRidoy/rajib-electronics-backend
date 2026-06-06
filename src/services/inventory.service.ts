import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";

export class InventoryService {
  /**
   * Add stock to product (e.g., new purchase, return)
   */
  static async addStock(
    productId: string,
    quantity: number,
    type: "PURCHASE" | "RETURN" | "ADJUSTMENT",
    performedBy: string,
    reason?: string,
    reference?: string
  ) {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Update product stock atomically
        const product = await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: quantity } },
          { new: true, session }
        );

        if (!product) {
          throw new Error("Product not found");
        }

        // Record stock movement
        await StockMovement.create([{
          productId,
          type,
          quantity,
          reason,
          reference,
          performedBy
        }], { session });
      });

      return { success: true };
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Remove stock from product (e.g., sale, damage)
   */
  static async removeStock(
    productId: string,
    quantity: number,
    type: "SALE" | "DAMAGE" | "ADJUSTMENT",
    performedBy: string,
    reason?: string,
    reference?: string
  ) {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Check current stock and update atomically
        const product = await Product.findOneAndUpdate(
          { 
            _id: productId, 
            stock: { $gte: quantity } // Ensure sufficient stock
          },
          { $inc: { stock: -quantity } },
          { new: true, session }
        );

        if (!product) {
          throw new Error("Insufficient stock or product not found");
        }

        // Record stock movement (negative quantity)
        await StockMovement.create([{
          productId,
          type,
          quantity: -quantity,
          reason,
          reference,
          performedBy
        }], { session });
      });

      return { success: true };
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get stock movement history for a product
   */
  static async getStockHistory(productId: string, limit = 50) {
    return await StockMovement.find({ productId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get current stock level
   */
  static async getCurrentStock(productId: string) {
    const product = await Product.findById(productId).select('stock').lean();
    return product?.stock || 0;
  }
}