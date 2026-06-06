import { Router } from "express";
import { z } from "zod";
import requireAdmin from "../../middlewares/auth.js";
import { cloudinary } from "../../lib/cloudinary.js";
import { env } from "../../env.js";

const router = Router();

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const ALLOWED_FOLDERS = ["banners", "products", "variants"];
const defaultFolder = env.CLOUDINARY_FOLDER || "banners";

// POST /api/v1/uploads?folder=variants
router.post("/uploads", requireAdmin, async (req, res) => {
  try {
    const folder = ALLOWED_FOLDERS.includes(req.query.folder as string)
      ? (req.query.folder as string)
      : defaultFolder;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      env.CLOUDINARY_API_SECRET
    );
    return res.json({
      ok: true,
      data: {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, message: "Failed to generate upload signature" });
  }
});

const DeleteDTO = z.object({ publicId: z.string().min(1) });

router.post("/uploads/delete", requireAdmin, async (req, res, next) => {
  try {
    const { publicId } = DeleteDTO.parse(req.body);
    const out = await cloudinary.uploader.destroy(publicId);
    return res.json({ ok: true, data: out });
  } catch (e) {
    next(e);
  }
});

export default router;
