import mongoose, { Schema, Document } from "mongoose";

// This is inter face for user
export interface ITag extends Document {
  tagName: string;
  createdAt: Date;
}

const tagSchema: Schema = new Schema({
  tagName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const tagModel = mongoose.model<ITag>("Tag", tagSchema);

// This is model for user

export { tagModel };
