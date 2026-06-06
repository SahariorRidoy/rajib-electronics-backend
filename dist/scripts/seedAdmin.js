import dotenv from "dotenv";
dotenv.config();
import { dbConnect } from "../db/connection.js";
import { Admin } from "../models/Admin.js";
import { hashPassword } from "../utils/hash.js";
async function main() {
    await dbConnect();
    const email = "admin@rajibelectronics.com";
    const existing = await Admin.findOne({ email });
    if (existing) {
        console.log("Admin already exists:", email);
        process.exit(0);
    }
    const passwordHash = await hashPassword("adminadmin");
    await Admin.create({ email, passwordHash, role: "ADMIN" });
    console.log("Admin created:", email);
    process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
