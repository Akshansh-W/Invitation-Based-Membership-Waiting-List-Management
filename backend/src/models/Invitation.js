import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const invitationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID,
    },

    code_hash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    created_by: {
      type: String,
      ref: "User",
      required: true,
    },

    max_uses: {
      type: Number,
      required: true,
      min: 1,
    },

    used_count: {
      type: Number,
      default: 0,
      min: 0,
    },

    expires_at: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVOKED", "EXPIRED"],
      default: "ACTIVE",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

invitationSchema.index({ status: 1, expires_at: 1 });

export default mongoose.model("Invitation", invitationSchema);