import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import requireAdmin from "../../middlewares/auth.js";
import { dbConnect } from "../../db/connection.js";
import { Notification } from "../../models/Notification.js";

const router = Router();

// Get all notifications with pagination
router.get("/notifications", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const unreadOnly = req.query.unread === "true";

    const filter = unreadOnly ? { isRead: false } : {};

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ isRead: false })
    ]);

    res.json({
      ok: true,
      data: {
        notifications: notifications.map(n => ({ ...n, _id: String(n._id) })),
        total,
        unreadCount,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, code: "INVALID_ID" });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ ok: false, code: "NOT_FOUND" });
    }

    res.json({
      ok: true,
      data: { ...notification, _id: String(notification._id) }
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as unread
router.patch("/notifications/:id/unread", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, code: "INVALID_ID" });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: false, $unset: { readAt: 1 } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ ok: false, code: "NOT_FOUND" });
    }

    res.json({
      ok: true,
      data: { ...notification, _id: String(notification._id) }
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.patch("/notifications/read-all", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    
    const result = await Notification.updateMany(
      { isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      ok: true,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
});

// Clear all read notifications
router.delete("/notifications/clear-read", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    
    const result = await Notification.deleteMany({ isRead: true });

    res.json({
      ok: true,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    next(error);
  }
});

// Manual trigger for stock alerts
router.post("/stock/check-alerts", requireAdmin, async (req, res, next) => {
  try {
    const threshold = parseInt(req.body.threshold as string) || 10;
    const { NotificationService } = await import("../../services/notification.service.js");
    
    const result = await NotificationService.triggerStockAlerts(threshold);
    
    res.json({
      ok: true,
      data: {
        message: "Stock alerts checked",
        lowStockAlerts: result.lowStock,
        outOfStockAlerts: result.outOfStock
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create notification (internal use)
export const createNotification = async (
  type: "ORDER" | "LOW_STOCK" | "OUT_OF_STOCK",
  title: string,
  message: string,
  relatedId?: string
) => {
  await dbConnect();
  return Notification.create({ type, title, message, relatedId });
};

export default router;