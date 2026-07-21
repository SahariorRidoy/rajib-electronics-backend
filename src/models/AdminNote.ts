import mongoose, { Schema, Document } from "mongoose";

export interface IAdminNote extends Document {
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminNoteSchema = new Schema<IAdminNote>(
  {
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const AdminNote = mongoose.model<IAdminNote>("AdminNote", AdminNoteSchema);
