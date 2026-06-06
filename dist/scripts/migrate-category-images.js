import mongoose from "mongoose";
import { dbConnect } from "../db/connection.js";
async function migrateCategoryImages() {
    try {
        await dbConnect();
        console.log("🔄 Starting category image migration...");
        const db = mongoose.connection.db;
        const collection = db.collection("categories");
        // Find all categories with old 'image' field
        const categories = await collection.find({ image: { $exists: true } }).toArray();
        let updated = 0;
        for (const doc of categories) {
            const images = doc.images && doc.images.length > 0
                ? doc.images
                : doc.image
                    ? [doc.image]
                    : [];
            // Update: set images array and remove old image field
            await collection.updateOne({ _id: doc._id }, {
                $set: { images },
                $unset: { image: "" }
            });
            updated++;
            console.log(`✅ Migrated: ${doc.name} (${doc.slug})`);
        }
        console.log(`\n✅ Migration complete! Updated ${updated} categories.`);
        console.log("✅ Old 'image' field removed from all categories.");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}
migrateCategoryImages();
