import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
// Import models with remaining images
import { Order } from "../models/Order";
import { InvoiceModel } from "../models/Invoice.model";
async function removeRemainingImages() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI not defined in environment variables");
        }
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB\n");
        // 1. Orders - Clear image field from order lines
        console.log("🔄 Processing Orders (clearing line item images)...");
        const orderResult = await Order.updateMany({}, { $set: { "lines.$[].image": "" } });
        console.log(`✅ Orders: Cleared images from ${orderResult.modifiedCount} documents\n`);
        // 2. Invoices - Clear pdfUrl field
        console.log("🔄 Processing Invoices (clearing PDF URLs)...");
        const invoiceResult = await InvoiceModel.updateMany({}, { $set: { pdfUrl: "" } });
        console.log(`✅ Invoices: Cleared pdfUrl from ${invoiceResult.modifiedCount} documents\n`);
        // Summary
        console.log("═".repeat(50));
        console.log("📊 REMAINING IMAGES MIGRATION SUMMARY");
        console.log("═".repeat(50));
        console.log(`✅ Orders (line item images):   ${orderResult.modifiedCount} updated`);
        console.log(`✅ Invoices (PDF URLs):         ${invoiceResult.modifiedCount} updated`);
        console.log("═".repeat(50));
        console.log("\n✅ All remaining images removed successfully!");
        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
    }
    catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}
removeRemainingImages();
