import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const redemptionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID,
    },

    invitation_id: {
      type: String,
      ref: "Invitation",
      required: true,
    },

    user_id: {
      type: String,
      ref: "User",
      required: true,
    },

    redeemed_at: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

// Prevent the same user redeeming the same invitation twice.
redemptionSchema.index(
  { invitation_id: 1, user_id: 1 },
  { unique: true }
);

export default mongoose.model(
  "InvitationRedemption",
  redemptionSchema
);