import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import requireAdmin from "../../middlewares/auth.js";
import { env } from "../../env.js";

const router = Router();

const ALLOWED_FOLDERS = ["banners", "products", "variants", "categories", "manufacturers", "logos"] as const;
type UploadFolder = typeof ALLOWED_FOLDERS[number];

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Store in memory first — sharp will process then save to disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpg, jpeg, png, webp images are allowed"));
    }
  },
});

function getUploadDir(folder: UploadFolder): string {
  const dir = path.join(process.cwd(), "uploads", folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// POST /api/v1/uploads?folder=products
router.post("/uploads", requireAdmin, upload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file provided" });
    }

    const folderParam = req.query.folder as string;
    const folder: UploadFolder = ALLOWED_FOLDERS.includes(folderParam as UploadFolder)
      ? (folderParam as UploadFolder)
      : "products";

    const filename = `${uuidv4()}.webp`;
    const uploadDir = getUploadDir(folder);
    const filePath = path.join(uploadDir, filename);

    // Process with sharp — convert to webp, resize max 1200px width, quality 80
    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filePath);

    const url = `${env.BACKEND_URL}/uploads/${folder}/${filename}`;
    const relativePath = `/uploads/${folder}/${filename}`;

    return res.status(201).json({ ok: true, data: { url, filePath: relativePath } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/uploads/delete
const DeleteDTO = z.object({ filePath: z.string().min(1) });

router.post("/uploads/delete", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath } = DeleteDTO.parse(req.body);

    // Security: only allow paths inside /uploads/
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith("/uploads/") && !normalized.startsWith("\\uploads\\")) {
      return res.status(400).json({ ok: false, message: "Invalid file path" });
    }

    const absolutePath = path.join(process.cwd(), normalized);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
