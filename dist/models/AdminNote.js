import mongoose, { Schema } from "mongoose";
const AdminNoteSchema = new Schema({
    text: { type: String, required: true, trim: true },
}, { timestamps: true });
export const AdminNote = mongoose.model("AdminNote", AdminNoteSchema);
