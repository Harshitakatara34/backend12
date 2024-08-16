import mongoose, { Schema, Document } from "mongoose";

// This is inter face for user
export interface IUser extends Document {
  userName: string;
  userAddress: string;
  bio: string;
  wesite: string;
  email: string;
  profileImage: string;
  coverImage: string;
  createdAt: Date;
}

// This is schema for user
const userSchema: Schema = new Schema({
  userName: { type: String, required: true },
  bio : { type: String },
  wesite: { type: String },
  email: { type: String },
  profileImage: { type: String },
  coverImage: { type: String },
  userAddress: { type: String, required: true, unique: true},
  createdAt: { type: Date, default: Date.now },
});

const userModel = mongoose.model<IUser>("User", userSchema);

// This is model for user
export { userModel };
