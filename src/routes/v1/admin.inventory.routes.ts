import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import requireAdmin from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";
import { InventoryService } from "../../services/inventory.service.js";

const router = Router();

const AddStockDTO = z.object({
  quantity: z.number().int().positive(),
  type: z.enum(["PURCHASE", "RETURN", "ADJUSTMENT"]).default("PURCHASE"),
  reason: z.string().optional(),
  reference: z.string().optional() // PO number, supplier invoice, etc.
});

const RemoveStockDTO = z.object({
  quantity: z.number().int().positive(),
  type: z.enum(["DAMAGE", "ADJUSTMENT"]).default("DAMAGE"),
  reason: z.string().min(1, "Reason required for stock removal"),
  reference: z.string().optional()
});

const IdParam = z.object({
  id: z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid ObjectId")
});

// Add stock to product
router.post("/products/:id/stock/add", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { id } = IdParam.parse(req.params);
    const body = AddStockDTO.parse(req.body);
    
    await InventoryService.addStock(
      id,
      body.quantity,
      body.type,
      (req as any).user._id,
      body.reason,
      body.reference
    );

    const currentStock = await InventoryService.getCurrentStock(id);
    
    // Check for stock alerts
    try {
      const { createNotification } = await import("./admin.notification.routes.js");
      const { Product } = await import("../../models/Product.js");
      const product = await Product.findById(id, "title").lean();
      if (product) {
        if (currentStock <= 0) {
          await createNotification(
            "OUT_OF_STOCK",
            "Out of Stock Alert",
            `${product.title} is now out of stock`,
            id
          );
        } else if (currentStock <= 10) {
          await createNotification(
            "LOW_STOCK",
            "Low Stock Alert",
            `${product.title} is running low (${currentStock} left)`,
            id
          );
        }
      }
    } catch (notificationError) {
      console.error("Failed to create stock notification:", notificationError);
    }
    
    res.json({
      ok: true,
      data: {
        message: `Added ${body.quantity} units to stock`,
        currentStock
      }
    });
  } catch (error: any) {
    if (error.message === "Product not found") {
      return res.status(404).json({ ok: false, code: "PRODUCT_NOT_FOUND" });
    }
    next(error);
  }
});

// Remove stock from product
router.post("/products/:id/stock/remove", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { id } = IdParam.parse(req.params);
    const body = RemoveStockDTO.parse(req.body);
    
    await InventoryService.removeStock(
      id,
      body.quantity,
      body.type,
      (req as any).user._id,
      body.reason,
      body.reference
    );

    const currentStock = await InventoryService.getCurrentStock(id);
    
    // Check for stock alerts
    try {
      const { createNotification } = await import("./admin.notification.routes.js");
      const { Product } = await import("../../models/Product.js");
      const product = await Product.findById(id, "title").lean();
      if (product) {
        if (currentStock <= 0) {
          await createNotification(
            "OUT_OF_STOCK",
            "Out of Stock Alert",
            `${product.title} is now out of stock`,
            id
          );
        } else if (currentStock <= 10) {
          await createNotification(
            "LOW_STOCK",
            "Low Stock Alert",
            `${product.title} is running low (${currentStock} left)`,
            id
          );
        }
      }
    } catch (notificationError) {
      console.error("Failed to create stock notification:", notificationError);
    }
    
    res.json({
      ok: true,
      data: {
        message: `Removed ${body.quantity} units from stock`,
        currentStock
      }
    });
  } catch (error: any) {
    if (error.message === "Insufficient stock or product not found") {
      return res.status(409).json({ 
        ok: false, 
        code: "INSUFFICIENT_STOCK",
        message: "Not enough stock available"
      });
    }
    next(error);
  }
});

// Get stock movement history
router.get("/products/:id/stock/history", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { id } = IdParam.parse(req.params);
    const limit = parseInt(req.query.limit as string) || 50;
    
    const history = await InventoryService.getStockHistory(id, limit);
    
    res.json({
      ok: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// Get out of stock products
router.get("/stock/out-of-stock", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { Product } = await import("../../models/Product.js");
    
    const products = await Product.find(
      { stock: { $lte: 0 }, status: "ACTIVE" },
      "_id title slug stock price categorySlug subcategorySlug brand"
    ).lean().exec();
    
    res.json({
      ok: true,
      data: products.map(p => ({ ...p, _id: String(p._id) }))
    });
  } catch (error) {
    next(error);
  }
});

// Get low stock products
router.get("/stock/low-stock", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { Product } = await import("../../models/Product.js");
    const threshold = parseInt(req.query.threshold as string) || 10;
    
    const products = await Product.find(
      { stock: { $gt: 0, $lte: threshold }, status: "ACTIVE" },
      "_id title slug stock price categorySlug subcategorySlug brand"
    ).lean().exec();
    
    res.json({
      ok: true,
      data: products.map(p => ({ ...p, _id: String(p._id) }))
    });
  } catch (error) {
    next(error);
  }
});

// Get stock overview
router.get("/stock/overview", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { Product } = await import("../../models/Product.js");
    const lowStockThreshold = parseInt(req.query.threshold as string) || 10;
    
    const [outOfStock, lowStock, totalProducts] = await Promise.all([
      Product.countDocuments({ stock: { $lte: 0 }, status: "ACTIVE" }),
      Product.countDocuments({ stock: { $gt: 0, $lte: lowStockThreshold }, status: "ACTIVE" }),
      Product.countDocuments({ status: "ACTIVE" })
    ]);
    
    res.json({
      ok: true,
      data: {
        outOfStock,
        lowStock,
        totalProducts,
        inStock: totalProducts - outOfStock - lowStock
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;