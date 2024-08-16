import mongoose, { Schema, Document } from "mongoose";

export interface IFollower extends Document {
  followerId: string;
  followingId: string;
  createdAt: Date;
}

const followerSchema: Schema = new Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

// This is model for user
const followerModel = mongoose.model<IFollower>("Follower", followerSchema);


export { followerModel };