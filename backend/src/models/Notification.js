import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const notificationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID,
    },

    user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 150,
    },

    body: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    read_at: {
      type: Date,
      default: null,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

notificationSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model("Notification", notificationSchema);