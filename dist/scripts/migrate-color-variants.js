import { dbConnect } from "../db/connection.js";
import { Product } from "../models/Product.js";
async function run() {
    await dbConnect();
    const result = await Product.updateMany({ colorVariants: { $exists: false } }, { $set: { colorVariants: [] } });
    console.log(`Updated ${result.modifiedCount} products with missing colorVariants field.`);
    process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
