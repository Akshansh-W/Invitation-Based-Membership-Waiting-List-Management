import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID,
    },

    full_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email_normalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone_normalized: {
      type: String,
      unique: true,
      sparse: true,
    },

    password_hash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      required: true,
    },

    account_status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DISABLED"],
      default: "ACTIVE",
      required: true,
    },

    membership_status: {
      type: String,
      enum: ["NON_MEMBER", "MEMBER"],
      default: "NON_MEMBER",
    },

    remaining_generations: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Remaining generations must be a whole number.",
      },
    },
  },
  
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export default mongoose.model("User", userSchema);