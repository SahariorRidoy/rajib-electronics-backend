import { Router } from "express";
import { z } from "zod";
import { dbConnect } from "../../db/connection.js";
import { requireAdmin } from "../../middlewares/auth.js";
import { AdminNote } from "../../models/AdminNote.js";

const router = Router();

const NoteTextDTO = z.object({
  text: z.string().min(1).max(1000),
});

// GET /admin/notes
router.get("/notes", requireAdmin, async (_req, res, next) => {
  try {
    await dbConnect();
    const notes = await AdminNote.find().sort({ createdAt: -1 }).lean();
    res.json({ ok: true, data: notes });
  } catch (err) {
    next(err);
  }
});

// POST /admin/notes
router.post("/notes", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { text } = NoteTextDTO.parse(req.body);
    const note = await AdminNote.create({ text });
    res.status(201).json({ ok: true, data: note });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/notes/:id
router.patch("/notes/:id", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const { text } = NoteTextDTO.parse(req.body);
    const note = await AdminNote.findByIdAndUpdate(
      req.params.id,
      { text },
      { new: true }
    );
    if (!note) return res.status(404).json({ ok: false, code: "NOTE_NOT_FOUND" });
    res.json({ ok: true, data: note });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/notes/:id
router.delete("/notes/:id", requireAdmin, async (req, res, next) => {
  try {
    await dbConnect();
    const note = await AdminNote.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ ok: false, code: "NOTE_NOT_FOUND" });
    res.json({ ok: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
});

export default router;
