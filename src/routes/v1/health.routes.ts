
import { Router } from "express";
import mongoose from "mongoose";
import { dbConnect } from "../../db/connection.js";

const router = Router();
router.get("/health", async (_req, res) => {
  try {
    await dbConnect();
    return res.json({
      ok: true,
      dbState: mongoose.connection.readyState, // 1 = connected
      host: mongoose.connection.host,
      db: mongoose.connection.name,
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "DB error" });
  }
});
export default router;
