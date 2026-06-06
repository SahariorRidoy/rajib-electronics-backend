import mongoose, { Schema } from "mongoose";
const NotificationSchema = new Schema({
    type: {
        type: String,
        enum: ["ORDER", "LOW_STOCK", "OUT_OF_STOCK"],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    relatedId: {
        type: String,
        required: false
    },
    readAt: {
        type: Date,
        required: false
    }
}, {
    timestamps: true
});
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ isRead: 1 });
export const Notification = mongoose.model("Notification", NotificationSchema);
