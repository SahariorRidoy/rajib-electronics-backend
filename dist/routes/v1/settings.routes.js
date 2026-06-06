import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { SiteSettings } from "../../models/SiteSettings.js";
const router = Router();
const toWhatsappLink = (num) => {
    const digits = num.replace(/\D/g, "");
    const normalized = digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`;
    return `https://wa.me/${normalized}`;
};
router.get("/settings", async (_req, res, next) => {
    try {
        await dbConnect();
        let settings = await SiteSettings.findOne().lean();
        if (!settings)
            settings = await SiteSettings.create({});
        // resolve whatsapp numbers into full links
        const socialLinks = (settings.socialLinks ?? []).map((s) => ({
            ...s,
            resolvedLink: s.platform.toLowerCase() === "whatsapp"
                ? toWhatsappLink(s.value)
                : s.value,
        }));
        res.json({ ok: true, data: { ...settings, socialLinks } });
    }
    catch (err) {
        next(err);
    }
});
export default router;
