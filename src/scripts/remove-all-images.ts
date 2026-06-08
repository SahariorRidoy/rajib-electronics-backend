import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Import all models
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Subcategory } from "../models/Subcategory";
import { Manufacturer } from "../models/Manufacturer";
import { Banner } from "../models/banner.model";
import { PromoCard } from "../models/PromoCard";
import { SiteSettings } from "../models/SiteSettings";
import { ManufacturerBanner } from "../models/ManufacturerBanner";

async function removeAllImages() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not defined in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // 1. Products - Clear images array
    console.log("🔄 Processing Products...");
    const productResult = await Product.updateMany(
      {},
      { $set: { images: [] } }
    );
    console.log(`✅ Products: Cleared images from ${productResult.modifiedCount} documents\n`);

    // 2. Categories - Clear images array
    console.log("🔄 Processing Categories...");
    const categoryResult = await Category.updateMany(
      {},
      { $set: { images: [] } }
    );
    console.log(`✅ Categories: Cleared images from ${categoryResult.modifiedCount} documents\n`);

    // 3. Subcategories - Clear images array
    console.log("🔄 Processing Subcategories...");
    const subcategoryResult = await Subcategory.updateMany(
      {},
      { $set: { images: [] } }
    );
    console.log(`✅ Subcategories: Cleared images from ${subcategoryResult.modifiedCount} documents\n`);

    // 4. Manufacturers - Clear image field
    console.log("🔄 Processing Manufacturers...");
    const manufacturerResult = await Manufacturer.updateMany(
      {},
      { $set: { image: "" } }
    );
    console.log(`✅ Manufacturers: Cleared image from ${manufacturerResult.modifiedCount} documents\n`);

    // 5. Banners - Clear image field
    console.log("🔄 Processing Banners...");
    const bannerResult = await Banner.updateMany(
      {},
      { $set: { image: "" } }
    );
    console.log(`✅ Banners: Cleared image from ${bannerResult.modifiedCount} documents\n`);

    // 6. PromoCards - Clear image field
    console.log("🔄 Processing PromoCards...");
    const promoResult = await PromoCard.updateMany(
      {},
      { $set: { image: "" } }
    );
    console.log(`✅ PromoCards: Cleared image from ${promoResult.modifiedCount} documents\n`);

    // 7. ManufacturerBanners - Clear image field
    console.log("🔄 Processing ManufacturerBanners...");
    const mfgBannerResult = await ManufacturerBanner.updateMany(
      {},
      { $set: { image: "" } }
    );
    console.log(`✅ ManufacturerBanners: Cleared image from ${mfgBannerResult.modifiedCount} documents\n`);

    // 8. SiteSettings - Clear logos array
    console.log("🔄 Processing SiteSettings...");
    const siteSettingsResult = await SiteSettings.updateMany(
      {},
      { $set: { "logos": [] } }
    );
    console.log(`✅ SiteSettings: Cleared logos from ${siteSettingsResult.modifiedCount} documents\n`);

    // Summary
    console.log("═".repeat(50));
    console.log("📊 MIGRATION SUMMARY");
    console.log("═".repeat(50));
    console.log(`✅ Products:              ${productResult.modifiedCount} updated`);
    console.log(`✅ Categories:            ${categoryResult.modifiedCount} updated`);
    console.log(`✅ Subcategories:         ${subcategoryResult.modifiedCount} updated`);
    console.log(`✅ Manufacturers:         ${manufacturerResult.modifiedCount} updated`);
    console.log(`✅ Banners:               ${bannerResult.modifiedCount} updated`);
    console.log(`✅ PromoCards:            ${promoResult.modifiedCount} updated`);
    console.log(`✅ ManufacturerBanners:   ${mfgBannerResult.modifiedCount} updated`);
    console.log(`✅ SiteSettings:          ${siteSettingsResult.modifiedCount} updated`);
    console.log("═".repeat(50));
    console.log("\n✅ All images removed successfully!");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

removeAllImages();
