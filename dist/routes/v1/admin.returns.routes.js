import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import requireAdmin from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";
import { Order } from "../../models/Order.js";
import { StockMovement } from "../../models/StockMovement.js";
import { InventoryService } from "../../services/inventory.service.js";
const router = Router();
const ReturnOrderDTO = z.object({
    orderId: z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid order ID"),
    reason: z.string().min(1, "Return reason required"),
    items: z.array(z.object({
        productId: z.string().refine(mongoose.Types.ObjectId.isValid, "Invalid product ID"),
        quantity: z.number().int().positive()
    })).min(1, "At least one item required"),
    notes: z.string().optional()
});
// POST /admin/returns - Process order return
router.post("/returns", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const body = ReturnOrderDTO.parse(req.body);
        // Verify order exists
        const order = await Order.findById(body.orderId);
        if (!order) {
            return res.status(404).json({ ok: false, code: "ORDER_NOT_FOUND" });
        }
        // Process each returned item
        const returnedItems = [];
        for (const item of body.items) {
            // Find the item in the order
            const orderLine = order.lines.find(line => line.productId.toString() === item.productId);
            if (!orderLine) {
                return res.status(400).json({
                    ok: false,
                    code: "ITEM_NOT_IN_ORDER",
                    message: `Product ${item.productId} not found in order`
                });
            }
            if (item.quantity > orderLine.qty) {
                return res.status(400).json({
                    ok: false,
                    code: "INVALID_QUANTITY",
                    message: `Cannot return ${item.quantity} items, order only has ${orderLine.qty}`
                });
            }
            // Add stock back to product
            await InventoryService.addStock(item.productId, item.quantity, "RETURN", req.user._id, `Order return: ${body.reason}`, body.orderId);
            returnedItems.push({
                productId: item.productId,
                title: orderLine.title,
                quantity: item.quantity
            });
        }
        // Update order status to RETURNED
        await Order.findByIdAndUpdate(body.orderId, { status: "RETURNED" });
        res.json({
            ok: true,
            data: {
                message: "Return processed successfully",
                orderId: body.orderId,
                reason: body.reason,
                returnedItems,
                notes: body.notes
            }
        });
    }
    catch (error) {
        if (error.message === "Product not found") {
            return res.status(404).json({ ok: false, code: "PRODUCT_NOT_FOUND" });
        }
        next(error);
    }
});
// GET /admin/returns - Get all return data
router.get("/returns", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
        const returns = await StockMovement.find({ type: "RETURN" })
            .populate("productId", "title slug images")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = await StockMovement.countDocuments({ type: "RETURN" });
        const formatted = returns.map((ret) => ({
            _id: ret._id.toString(),
            orderId: ret.reference,
            product: {
                id: ret.productId?._id?.toString(),
                title: ret.productId?.title || "Unknown Product",
                slug: ret.productId?.slug,
                image: ret.productId?.images?.[0]
            },
            quantity: ret.quantity,
            reason: ret.reason,
            performedBy: ret.performedBy.toString(),
            createdAt: ret.createdAt
        }));
        res.json({
            ok: true,
            data: {
                items: formatted,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
