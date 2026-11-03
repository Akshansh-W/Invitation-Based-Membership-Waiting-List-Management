import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const auditLogSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID,
    },

    actor_id: {
      type: String,
      ref: "User",
      default: null,
    },

    action: {
      type: String,
      required: true,
    },

    target_type: {
      type: String,
      required: true,
    },

    target_id: {
      type: String,
      required: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

auditLogSchema.index({ target_type: 1, target_id: 1, created_at: -1 });

export default mongoose.model("AuditLog", auditLogSchema);