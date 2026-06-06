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
    contactInfo: {
        phones: { type: [String], default: [] },
        emails: { type: [String], default: [] },
    },
    socialLinks: { type: [SocialLinkSchema], default: [] },
}, { timestamps: true });
export const SiteSettings = models.SiteSettings ||
    model("SiteSettings", SiteSettingsSchema);
