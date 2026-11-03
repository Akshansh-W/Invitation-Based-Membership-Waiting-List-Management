import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const applicationSchema = new mongoose.Schema(
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

    invitation_id: {
      type: String,
      ref: "Invitation",
      required: true,
    },

    designation: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    company: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    experience_years: {
      type: Number,
      min: 0,
      max: 80,
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: "Experience must be a whole number of years.",
      },
      default: null,
    },

    application_status: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
    },

    priority: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
    },

    priority_score: {
      type: Number,
      default: 0,
    },

    submitted_at: {
      type: Date,
      default: Date.now,
    },

    reviewed_by: {
      type: String,
      ref: "User",
      default: null,
    },

    reviewed_at: {
      type: Date,
      default: null,
    },

    rejection_reason: {
      type: String,
      default: null,
    },

    internal_notes: {
      type: String,
      default: "",
    },
  },
  { versionKey: false }
);

applicationSchema.index({ application_status: 1, priority: 1 });
applicationSchema.index({ user_id: 1, submitted_at: -1 });

export default mongoose.model("Application", applicationSchema);