import mongoose from "mongoose";
import { Product } from "../models/Product";
import dotenv from "dotenv";

dotenv.config();

async function removeProductImages() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not defined in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Update all products: set images array to empty
    const result = await Product.updateMany(
      {},
      { $set: { images: [] } }
    );

    console.log(`✅ Successfully removed images from ${result.modifiedCount} products`);
    console.log(`⏭️  Matched: ${result.matchedCount} products`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

removeProductImages();
