
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const commentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID(),
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

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID(),
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    artist: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    image: {
      type: String,
      required: true,
      trim: true,
    },

    user_id: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    likes: {
      type: Number,
      default: 0,
      min: 0,
    },

    liked_by: {
      type: [String],
      default: [],
    },

    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Post", postSchema);
