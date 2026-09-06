import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { SiteSettings } from "../../models/SiteSettings.js";

const router = Router();

const toWhatsappLink = (num: string) => {
  const digits = num.replace(/\D/g, "");
  const normalized = digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`;
  return `https://wa.me/${normalized}`;
};

router.get("/settings", async (_req, res, next) => {
  try {
    await dbConnect();
    let settings = await SiteSettings.findOne().lean();
    if (!settings) settings = await SiteSettings.create({});

    // resolve whatsapp numbers into full links
    const socialLinks = (settings.socialLinks ?? []).map((s: any) => ({
      ...s,
      resolvedLink:
        s.platform.toLowerCase() === "whatsapp"
          ? toWhatsappLink(s.value)
          : s.value,
    }));

    res.json({ ok: true, data: { ...settings, socialLinks } });
  } catch (err) {
    next(err);
  }
});

// GET /settings/tiktok-pixel — public endpoint for frontend pixel injection
router.get("/settings/tiktok-pixel", async (_req, res, next) => {
  try {
    await dbConnect();
    const settings = await SiteSettings.findOne().lean() as any;
    const pixel = settings?.tiktokPixel ?? { pixelId: "", isEnabled: false };
    res.json({ ok: true, data: pixel });
  } catch (err) {
    next(err);
  }
});

export default router;
