import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

export interface LogoEntry {
  logoUrl: string;
  logoPublicId: string;
  isActive: boolean;
}

export interface SocialLinkEntry {
  _id?: mongoose.Types.ObjectId;
  platform: string; // e.g. "facebook", "youtube", "whatsapp", "tiktok", "instagram", "messenger", or any custom
  value: string;    // raw value: phone number for whatsapp, URL for others
  label?: string;   // optional display label
}

export interface ContactInfo {
  phones: string[];
  emails: string[];
}

export interface SiteSettingsDoc extends mongoose.Document {
  logos: LogoEntry[];
  siteName: string;
  contactInfo: ContactInfo;
  socialLinks: SocialLinkEntry[];
}

const LogoSchema = new Schema<LogoEntry>(
  {
    logoUrl: { type: String, required: true },
    logoPublicId: { type: String, required: true },
    isActive: { type: Boolean, default: false },
  },
  { _id: true }
);

const SocialLinkSchema = new Schema<SocialLinkEntry>(
  {
    platform: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    label: { type: String, default: "" },
  },
  { _id: true }
);

const SiteSettingsSchema = new Schema<SiteSettingsDoc>(
  {
    logos: { type: [LogoSchema], default: [] },
    siteName: { type: String, default: "Rajib Electronics" },
    contactInfo: {
      phones: { type: [String], default: [] },
      emails: { type: [String], default: [] },
    },
    socialLinks: { type: [SocialLinkSchema], default: [] },
  },
  { timestamps: true }
);

export const SiteSettings =
  (models.SiteSettings as mongoose.Model<SiteSettingsDoc>) ||
  model<SiteSettingsDoc>("SiteSettings", SiteSettingsSchema);
