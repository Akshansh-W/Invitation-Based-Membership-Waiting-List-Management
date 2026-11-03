import crypto from "node:crypto";
import mongoose from "mongoose";

import User from "../models/User.js";
import Invitation from "../models/Invitation.js";
import { applyForMembership } from "./membershipController.js";

export const generateInvitation = async (req, res) => {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const referralCode = crypto.randomBytes(9).toString("hex").toUpperCase();
    const codeHash = crypto
      .createHash("sha256")
      .update(referralCode)
      .digest("hex");
    const session = await mongoose.startSession();

    try {
      let remainingGenerations;

      await session.withTransaction(async () => {
        const user = await User.findById(req.user.userId).session(session);

        if (!user || user.account_status !== "ACTIVE") {
          const error = new Error("Your account is not active.");
          error.statusCode = 403;
          throw error;
        }

        if (user.membership_status !== "MEMBER") {
          const error = new Error("Only active members can generate referral codes.");
          error.statusCode = 403;
          throw error;
        }

        await User.updateOne(
          { _id: user._id, remaining_generations: { $exists: false } },
          { $set: { remaining_generations: 5 } },
          { session, runValidators: true }
        );

        const updatedUser = await User.findOneAndUpdate(
          {
            _id: user._id,
            account_status: "ACTIVE",
            membership_status: "MEMBER",
            remaining_generations: { $gte: 1 },
          },
          { $inc: { remaining_generations: -1 } },
          { new: true, session, runValidators: true }
        );

        if (!updatedUser) {
          const error = new Error("You have no referral code generations remaining.");
          error.statusCode = 409;
          throw error;
        }

        await Invitation.create(
          [
            {
              code_hash: codeHash,
              created_by: user._id,
              max_uses: 1,
              expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              status: "ACTIVE",
            },
          ],
          { session }
        );

        remainingGenerations = updatedUser.remaining_generations;
      });

      return res.status(201).json({
        message: "Referral code generated successfully.",
        referralCode,
        remaining_generations: remainingGenerations,
      });
    } catch (error) {
      if (error.code === 11000 && attempt < maxAttempts - 1) {
        continue;
      }

      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      console.error("Referral code generation error:", error);
      return res.status(500).json({
        message: "Unable to generate a referral code.",
      });
    } finally {
      await session.endSession();
    }
  }

  console.error("Referral code generation failed after repeated code collisions.");
  return res.status(500).json({
    message: "Unable to generate a referral code.",
  });
};

export const redeemInvitation = applyForMembership;
