import { createNotification } from "../routes/v1/admin.notification.routes.js";
import { Product } from "../models/Product.js";
import { dbConnect } from "../db/connection.js";
export class NotificationService {
    // Create order notification
    static async createOrderNotification(orderId, customerName, total) {
        try {
            await createNotification("ORDER", "New Order Received", `New order from ${customerName} - Total: ৳${total.toFixed(2)}`, orderId);
        }
        catch (error) {
            console.error("Failed to create order notification:", error);
        }
    }
    // Check and create low stock notifications
    static async checkLowStockAlerts(threshold = 10) {
        try {
            await dbConnect();
            const lowStockProducts = await Product.find({
                stock: { $gt: 0, $lte: threshold },
                status: "ACTIVE"
            }, "title stock").lean();
            const outOfStockProducts = await Product.find({
                stock: { $lte: 0 },
                status: "ACTIVE"
            }, "title stock").lean();
            // Create low stock notifications
            for (const product of lowStockProducts) {
                await createNotification("LOW_STOCK", "Low Stock Alert", `${product.title} is running low (${product.stock} left)`, String(product._id));
            }
            // Create out of stock notifications
            for (const product of outOfStockProducts) {
                await createNotification("OUT_OF_STOCK", "Out of Stock Alert", `${product.title} is out of stock`, String(product._id));
            }
            return {
                lowStock: lowStockProducts.length,
                outOfStock: outOfStockProducts.length
            };
        }
        catch (error) {
            console.error("Failed to check stock alerts:", error);
            return { lowStock: 0, outOfStock: 0 };
        }
    }
    // Manual trigger for stock alerts
    static async triggerStockAlerts(threshold = 10) {
        return this.checkLowStockAlerts(threshold);
    }
}
