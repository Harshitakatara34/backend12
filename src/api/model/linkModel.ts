import mongoose, { Schema, Document } from "mongoose";

export interface ILink extends Document {
  userId : string;
  twitter: string;
  instagram: string;
  discord: string;
  youtube: string;
  createdAt: Date;
}


const LinkSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  twitter: String,
  instagram: String,
  discord: String,
  youtube: String,
  createdAt: { type: Date, default: Date.now },
});


const linkModal = mongoose.model<ILink>("Link", LinkSchema);

export { linkModal };
