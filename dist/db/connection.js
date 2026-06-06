// src/db/connection.ts
import mongoose from "mongoose";
import { env } from "../env.js";
// global singletons (serverless/hot-reload safe)
if (!global.__mongooseConn)
    global.__mongooseConn = null;
if (!global.__mongoosePromise)
    global.__mongoosePromise = null;
// safer defaults
mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false); // avoid silent query buffering
export async function dbConnect() {
    // already connected
    if (global.__mongooseConn && mongoose.connection.readyState === 1) {
        return global.__mongooseConn;
    }
    if (!env.MONGODB_URI) {
        throw new Error("❌ MongoDB URI missing. Check MONGODB_URI in env.");
    }
    // in-flight connect
    if (!global.__mongoosePromise) {
        global.__mongoosePromise = mongoose.connect(env.MONGODB_URI, {
            dbName: env.MONGODB_DB || "RajibElectronics",
            serverSelectionTimeoutMS: 20000, // 20s
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
        });
    }
    global.__mongooseConn = await global.__mongoosePromise;
    return global.__mongooseConn;
}
