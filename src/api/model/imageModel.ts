import mongoose, { Schema, Document } from "mongoose";


export interface interImages extends Document {
  userId: string;
  imageUrl: string;
  description: string;
  isPublic: boolean;
  views: number;
  tags: string[];
  likes: string[];
  createdAt: Date;
}

const imageSchema: Schema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isPublic: { type: Boolean, default: false },
  imageUrl: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  tags: [{ type: String }],
  likes: [{type: mongoose.Schema.Types.ObjectId}],
});

const imageModel = mongoose.model<interImages>("Image", imageSchema);

// This is model for Images
export { imageModel };
