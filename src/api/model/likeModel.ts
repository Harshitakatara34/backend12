import mongoose, { Schema, Document } from "mongoose";

export interface ILike extends Document {
  imageId: string;
  userId: string;
  createdAt: Date;
  type: string;
}

const likeSchema: Schema = new Schema({
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image",
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const likeModel = mongoose.model<ILike>("Like", likeSchema);

export { likeModel };
