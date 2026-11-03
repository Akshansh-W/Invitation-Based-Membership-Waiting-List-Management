import crypto from "node:crypto";
import mongoose from "mongoose";

import Invitation from "../models/Invitation.js";
import InvitationRedemption from "../models/InvitationRedemption.js";
import Application from "../models/Application.js";
import AuditLog from "../models/AuditLog.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export async function applyForMembership(req, res) {
  const userId = req.user?.userId;
  const referralCode =
    typeof req.body.referralCode === "string"
      ? req.body.referralCode.trim()
      : "";
  const designation = typeof req.body.designation === "string" ? req.body.designation.trim() : "";
  const company = typeof req.body.company === "string" ? req.body.company.trim() : "";
  const experienceYears =
    req.body.experience_years === "" || req.body.experience_years == null
      ? null
      : Number(req.body.experience_years);

  if (!userId) {
    return res.status(401).json({ message: "Please log in." });
  }

  if (!referralCode) {
    return res.status(400).json({
      message: "Referral code is required.",
    });
  }

  if (
    designation.length > 100 ||
    company.length > 150 ||
    (experienceYears !== null &&
      (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 80))
  ) {
    return res.status(400).json({
      message: "Please provide valid application profile details.",
    });
  }

  // Hash the code before searching the database.
  const codeHash = crypto
    .createHash("sha256")
    .update(referralCode.toUpperCase())
    .digest("hex");

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);

      if (!user || user.account_status !== "ACTIVE") {
        const error = new Error("Your account is not active.");
        error.statusCode = 403;
        throw error;
      }

      if (user.role === "ADMIN") {
        const error = new Error("Administrator accounts do not submit membership applications.");
        error.statusCode = 403;
        throw error;
      }

      if (user.membership_status === "MEMBER") {
        const error = new Error("You are already a member.");
        error.statusCode = 409;
        throw error;
      }

      // Atomically claim a slot only if capacity remains.
      const invitation = await Invitation.findOneAndUpdate(
        {
          code_hash: codeHash,
          status: "ACTIVE",
          expires_at: { $gt: new Date() },
          $expr: { $lt: ["$used_count", "$max_uses"] },
        },
        {
          $inc: { used_count: 1 },
        },
        {
          new: true,
          session,
        }
      );

      if (!invitation) {
        const error = new Error(
          "Invalid, expired, revoked, or fully used invitation."
        );
        error.statusCode = 400;
        throw error;
      }

      const existingApplication = await Application.findOne({
        user_id: userId,
        application_status: {
          $in: ["PENDING", "UNDER_REVIEW", "APPROVED"],
        },
      }).session(session);

      if (existingApplication) {
        const error = new Error(
          "You already have an active membership application."
        );
        error.statusCode = 409;
        throw error;
      }

      await InvitationRedemption.create(
        [
          {
            invitation_id: invitation._id,
            user_id: userId,
          },
        ],
        { session }
      );

      const [application] = await Application.create(
        [
          {
            user_id: userId,
            invitation_id: invitation._id,
            application_status: "PENDING",
            priority: "MEDIUM",
            designation,
            company,
            experience_years: experienceYears,
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            actor_id: userId,
            action: "MEMBERSHIP_APPLICATION_SUBMITTED",
            target_type: "Application",
            target_id: application._id,
            metadata: {
              invitation_id: invitation._id,
            },
          },
        ],
        { session }
      );

      await Notification.create(
        [
          {
            user_id: userId,
            type: "MEMBERSHIP_APPLICATION_SUBMITTED",
            title: "Membership application submitted",
            body: "Your application has been submitted and is pending administrator review.",
          },
        ],
        { session }
      );
    });

    return res.status(201).json({
      message: "Membership application submitted successfully.",
      status: "PENDING",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This invitation has already been redeemed by you.",
      });
    }

    console.error("Membership application error:", error);

    return res.status(500).json({
      message: "Unable to submit your application.",
    });
  } finally {
    await session.endSession();
  }
}

export async function getMembershipApplicationStatus(req, res) {
  try {
    const user = await User.findById(req.user.userId).select(
      "account_status membership_status"
    );

    if (!user || user.account_status !== "ACTIVE") {
      return res.status(404).json({
        message: "User not found or account is inactive.",
      });
    }

    const application = await Application.findOne({
      user_id: req.user.userId,
    })
      .sort({ submitted_at: -1 })
      .select("application_status priority submitted_at rejection_reason");

    return res.status(200).json({
      membership_status: user.membership_status,
      application: application
        ? {
            status: application.application_status,
            priority: application.priority,
            submitted_at: application.submitted_at,
            rejection_reason: application.rejection_reason,
          }
        : null,
    });
  } catch (error) {
    console.error("Membership application status error:", error);
    return res.status(500).json({
      message: "Unable to fetch your application status.",
    });
  }
}
