
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const commentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID(),
    },

    post_id: {
      type: String,
      ref: "Post",
      required: true,
      index: true,
    },

    user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    author_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ post_id: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
