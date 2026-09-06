import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const LogoSchema = new Schema({
    logoUrl: { type: String, required: true },
    logoPublicId: { type: String, required: true },
    isActive: { type: Boolean, default: false },
}, { _id: true });
const SocialLinkSchema = new Schema({
    platform: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    label: { type: String, default: "" },
}, { _id: true });
const SiteSettingsSchema = new Schema({
    logos: { type: [LogoSchema], default: [] },
    siteName: { type: String, default: "Rajib Electronics" },
    hotline: { type: String, default: "" },
    contactInfo: {
        phones: { type: [String], default: [] },
        emails: { type: [String], default: [] },
    },
    socialLinks: { type: [SocialLinkSchema], default: [] },
    paystationSettings: {
        merchantId: { type: String, default: "" },
        password: { type: String, default: "" },
        baseUrl: { type: String, default: "https://sandbox.paystation.com.bd" },
        isLive: { type: Boolean, default: false },
    },
    tiktokPixel: {
        pixelId: { type: String, default: "" },
        isEnabled: { type: Boolean, default: false },
    },
}, { timestamps: true });
export const SiteSettings = models.SiteSettings ||
    model("SiteSettings", SiteSettingsSchema);
