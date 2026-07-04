import { Router } from "express";
import { z } from "zod";
import { dbConnect } from "../../db/connection.js";
import { SiteSettings } from "../../models/SiteSettings.js";
import { requireAdmin } from "../../middlewares/auth.js";
const router = Router();
// whatsapp: strip leading 0, prepend 880 (BD), remove any non-digits
const toWhatsappLink = (num) => {
    const digits = num.replace(/\D/g, "");
    const normalized = digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`;
    return `https://wa.me/${normalized}`;
};
const SocialLinkBody = z.object({
    platform: z.string().min(1),
    value: z.string().min(1),
    label: z.string().optional(),
});
const ContactBody = z.object({
    phones: z.array(z.string().min(1)).optional(),
    emails: z.array(z.string().min(1)).optional(),
});
// GET — fetch current settings
router.get("/settings", requireAdmin, async (_req, res, next) => {
    try {
        await dbConnect();
        const settings = await SiteSettings.findOne();
        if (!settings)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        res.json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
// PATCH — update site name
router.patch("/settings", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { siteName } = z.object({ siteName: z.string().min(1) }).parse(req.body);
        let settings = await SiteSettings.findOne();
        if (!settings)
            settings = await SiteSettings.create({ siteName });
        else {
            settings.siteName = siteName;
            await settings.save();
        }
        res.json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /settings/hotline — update hotline number
router.patch("/settings/hotline", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { hotline } = z.object({ hotline: z.string() }).parse(req.body);
        let settings = await SiteSettings.findOne();
        if (!settings)
            settings = await SiteSettings.create({});
        settings.hotline = hotline;
        await settings.save();
        res.json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /settings/contact — update phones & emails
router.patch("/settings/contact", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const body = ContactBody.parse(req.body);
        let settings = await SiteSettings.findOne();
        if (!settings)
            settings = await SiteSettings.create({});
        if (body.phones !== undefined)
            settings.contactInfo.phones = body.phones;
        if (body.emails !== undefined)
            settings.contactInfo.emails = body.emails;
        await settings.save();
        res.json({ ok: true, data: settings.contactInfo });
    }
    catch (err) {
        next(err);
    }
});
// POST /settings/social — add a social link
router.post("/settings/social", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const body = SocialLinkBody.parse(req.body);
        let settings = await SiteSettings.findOne();
        if (!settings)
            settings = await SiteSettings.create({});
        settings.socialLinks.push({ platform: body.platform, value: body.value, label: body.label ?? "" });
        await settings.save();
        res.status(201).json({ ok: true, data: settings.socialLinks });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /settings/social/:id — update a social link
router.patch("/settings/social/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const body = SocialLinkBody.partial().parse(req.body);
        const settings = await SiteSettings.findOne();
        if (!settings)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        const link = settings.socialLinks.find((s) => s._id.toString() === req.params.id);
        if (!link)
            return res.status(404).json({ ok: false, code: "SOCIAL_NOT_FOUND" });
        if (body.platform !== undefined)
            link.platform = body.platform;
        if (body.value !== undefined)
            link.value = body.value;
        if (body.label !== undefined)
            link.label = body.label ?? "";
        await settings.save();
        res.json({ ok: true, data: settings.socialLinks });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /settings/social/:id — remove a social link
router.delete("/settings/social/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const settings = await SiteSettings.findOne();
        if (!settings)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        const idx = settings.socialLinks.findIndex((s) => s._id.toString() === req.params.id);
        if (idx === -1)
            return res.status(404).json({ ok: false, code: "SOCIAL_NOT_FOUND" });
        settings.socialLinks.splice(idx, 1);
        await settings.save();
        res.json({ ok: true, data: settings.socialLinks });
    }
    catch (err) {
        next(err);
    }
});
// POST /settings/logos — add a logo (max 3)
router.post("/settings/logos", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const { logoUrl, logoPublicId } = z.object({
            logoUrl: z.string().url(),
            logoPublicId: z.string().min(1),
        }).parse(req.body);
        let settings = await SiteSettings.findOne();
        if (!settings)
            settings = await SiteSettings.create({});
        if (settings.logos.length >= 3) {
            return res.status(400).json({ ok: false, code: "MAX_LOGOS_REACHED", message: "Maximum 3 logos allowed" });
        }
        const isFirst = settings.logos.length === 0;
        settings.logos.push({ logoUrl, logoPublicId, isActive: isFirst });
        await settings.save();
        res.status(201).json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /settings/logos/:logoId/activate — set one logo as active
router.patch("/settings/logos/:logoId/activate", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const settings = await SiteSettings.findOne();
        if (!settings)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        const logo = settings.logos.find((l) => l._id.toString() === req.params.logoId);
        if (!logo)
            return res.status(404).json({ ok: false, code: "LOGO_NOT_FOUND" });
        settings.logos.forEach((l) => (l.isActive = false));
        logo.isActive = true;
        await settings.save();
        res.json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /settings/logos/:logoId — remove a logo
router.delete("/settings/logos/:logoId", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const settings = await SiteSettings.findOne();
        if (!settings)
            return res.status(404).json({ ok: false, code: "NOT_FOUND" });
        const logoIndex = settings.logos.findIndex((l) => l._id.toString() === req.params.logoId);
        if (logoIndex === -1)
            return res.status(404).json({ ok: false, code: "LOGO_NOT_FOUND" });
        const wasActive = settings.logos[logoIndex].isActive;
        settings.logos.splice(logoIndex, 1);
        // if deleted logo was active, auto-activate the first remaining one
        if (wasActive && settings.logos.length > 0) {
            settings.logos[0].isActive = true;
        }
        await settings.save();
        res.json({ ok: true, data: settings });
    }
    catch (err) {
        next(err);
    }
});
export default router;
