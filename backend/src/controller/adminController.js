import mongoose from "mongoose";

import Application from "../models/Application.js";
import AuditLog from "../models/AuditLog.js";
import Invitation from "../models/Invitation.js";
import InvitationRedemption from "../models/InvitationRedemption.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const applicationStatuses = new Set([
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
]);
const applicationPriorities = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export async function listMembers(req, res) {
  try {
    const members = await User.find({
      role: "USER",
      membership_status: "MEMBER",
    })
      .select("full_name email_normalized membership_status created_at")
      .sort({ created_at: -1 })
      .lean();

    const memberIds = members.map((member) => member._id);
    const invitations = memberIds.length
      ? await Invitation.find({ created_by: { $in: memberIds } })
          .select("_id created_by")
          .lean()
      : [];
    const invitationOwners = new Map(
      invitations.map((invitation) => [invitation._id, invitation.created_by])
    );
    const referralCodeCounts = new Map();
    for (const invitation of invitations) {
      referralCodeCounts.set(
        invitation.created_by,
        (referralCodeCounts.get(invitation.created_by) || 0) + 1
      );
    }

    const redemptions = invitations.length
      ? await InvitationRedemption.find({
          invitation_id: { $in: invitations.map((invitation) => invitation._id) },
        })
          .select("invitation_id")
          .lean()
      : [];
    const referralCounts = new Map();

    for (const redemption of redemptions) {
      const ownerId = invitationOwners.get(redemption.invitation_id);
      if (ownerId) {
        referralCounts.set(ownerId, (referralCounts.get(ownerId) || 0) + 1);
      }
    }

    return res.status(200).json({
      members: members.map((member) => ({
        id: member._id,
        name: member.full_name,
        email: member.email_normalized,
        membership_status: member.membership_status,
        registered_at: member.created_at,
        referral_codes: referralCodeCounts.get(member._id) || 0,
        referrals_used: referralCounts.get(member._id) || 0,
      })),
    });
  } catch (error) {
    console.error("Admin member list error:", error);
    return res.status(500).json({ message: "Unable to fetch members." });
  }
}

export async function listApplications(req, res) {
  try {
    const applications = await Application.find({
      application_status: { $ne: "APPROVED" },
    })
      .sort({ priority: 1, submitted_at: 1 })
      .populate("user_id", "full_name email_normalized created_at role")
      .populate("invitation_id", "created_by created_at")
      .lean();

    const inviterIds = [
      ...new Set(
        applications
          .map((application) => application.invitation_id?.created_by)
          .filter(Boolean)
      ),
    ];
    const inviters = inviterIds.length
      ? await User.find({ _id: { $in: inviterIds } })
          .select("full_name email_normalized")
          .lean()
      : [];
    const inviterById = new Map(inviters.map((inviter) => [inviter._id, inviter]));

    return res.status(200).json({
      applications: applications
        .filter((application) => application.user_id?.role !== "ADMIN")
        .map((application) => {
        const inviter = inviterById.get(application.invitation_id?.created_by);
        return {
          id: application._id,
          applicant: application.user_id
            ? {
                id: application.user_id._id,
                name: application.user_id.full_name,
                email: application.user_id.email_normalized,
                registered_at: application.user_id.created_at,
              }
            : null,
          designation: application.designation || "",
          company: application.company || "",
          experience_years: application.experience_years,
          inviter: inviter
            ? { name: inviter.full_name, email: inviter.email_normalized }
            : null,
          submitted_at: application.submitted_at,
          status: application.application_status,
          priority: application.priority,
          rejection_reason: application.rejection_reason,
        };
        }),
    });
  } catch (error) {
    console.error("Admin application list error:", error);
    return res.status(500).json({
      message: "Unable to fetch membership applications.",
    });
  }
}

export async function updateApplication(req, res) {
  const { applicationId } = req.params;
  const { status, priority, rejection_reason: rejectionReason } = req.body || {};

  if (typeof applicationId !== "string" || !applicationId.trim()) {
    return res.status(400).json({ message: "Invalid application ID." });
  }

  if (
    status === undefined &&
    priority === undefined
  ) {
    return res.status(400).json({
      message: "Provide an application status or priority to update.",
    });
  }

  if (status !== undefined && !applicationStatuses.has(status)) {
    return res.status(400).json({ message: "Invalid application status." });
  }

  if (priority !== undefined && !applicationPriorities.has(priority)) {
    return res.status(400).json({ message: "Invalid application priority." });
  }

  if (
    rejectionReason !== undefined &&
    (typeof rejectionReason !== "string" || rejectionReason.trim().length > 1000)
  ) {
    return res.status(400).json({ message: "Invalid rejection reason." });
  }

  const session = await mongoose.startSession();

  try {
    let updatedApplication;

    await session.withTransaction(async () => {
      const application = await Application.findById(applicationId).session(session);

      if (!application) {
        const error = new Error("Membership application not found.");
        error.statusCode = 404;
        throw error;
      }

      const previousStatus = application.application_status;
      const previousPriority = application.priority;
      const nextStatus = status ?? previousStatus;
      const nextPriority = priority ?? previousPriority;
      const statusChanged = nextStatus !== previousStatus;
      const priorityChanged = nextPriority !== previousPriority;

      if (!statusChanged && !priorityChanged) {
        const error = new Error("The application already has those values.");
        error.statusCode = 400;
        throw error;
      }

      if (statusChanged) {
        application.application_status = nextStatus;
        application.reviewed_by = req.user.userId;
        application.reviewed_at = new Date();
        application.rejection_reason =
          nextStatus === "REJECTED" ? rejectionReason?.trim() || null : null;

        const user = await User.findById(application.user_id).session(session);
        if (!user) {
          const error = new Error("Applicant account not found.");
          error.statusCode = 404;
          throw error;
        }

        if (nextStatus === "APPROVED" && user.role === "ADMIN") {
          const error = new Error("Administrator accounts cannot be approved as members.");
          error.statusCode = 409;
          throw error;
        }

        user.membership_status = nextStatus === "APPROVED" ? "MEMBER" : "NON_MEMBER";
        await user.save({ session });
      }

      if (priorityChanged) {
        application.priority = nextPriority;
      }

      await application.save({ session });

      const changes = {};
      if (statusChanged) {
        changes.status = { from: previousStatus, to: nextStatus };
      }
      if (priorityChanged) {
        changes.priority = { from: previousPriority, to: nextPriority };
      }
      if (nextStatus === "REJECTED" && rejectionReason?.trim()) {
        changes.rejection_reason = rejectionReason.trim();
      }

      await AuditLog.create(
        [
          {
            actor_id: req.user.userId,
            action: "MEMBERSHIP_APPLICATION_UPDATED",
            target_type: "Application",
            target_id: application._id,
            metadata: changes,
          },
        ],
        { session }
      );

      if (statusChanged || priorityChanged) {
        const title = statusChanged
          ? {
              PENDING: "Application pending",
              UNDER_REVIEW: "Application under review",
              APPROVED: "Membership application approved",
              REJECTED: "Membership application declined",
            }[nextStatus]
          : "Application priority updated";
        const body = statusChanged
          ? {
              PENDING: "Your membership application is pending administrator review.",
              UNDER_REVIEW: "An administrator is reviewing your membership application.",
              APPROVED: "Your membership application has been approved. Welcome to ArtSpace!",
              REJECTED: rejectionReason?.trim()
                ? `Your membership application was declined: ${rejectionReason.trim()}`
                : "Your membership application was declined.",
            }[nextStatus]
          : `Your membership application priority is now ${nextPriority.toLowerCase()}.`;

        await Notification.create(
          [
            {
              user_id: application.user_id,
              type: statusChanged
                ? `MEMBERSHIP_APPLICATION_${nextStatus}`
                : "MEMBERSHIP_APPLICATION_PRIORITY_UPDATED",
              title,
              body,
            },
          ],
          { session }
        );
      }

      updatedApplication = {
        id: application._id,
        status: application.application_status,
        priority: application.priority,
        rejection_reason: application.rejection_reason,
        reviewed_at: application.reviewed_at,
      };
    });

    return res.status(200).json({
      message: "Membership application updated.",
      application: updatedApplication,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Admin application update error:", error);
    return res.status(500).json({
      message: "Unable to update the membership application.",
    });
  } finally {
    await session.endSession();
  }
}

export async function listReferrals(req, res) {
  try {
    const invitations = await Invitation.find({})
      .select("_id created_by max_uses status expires_at created_at")
      .sort({ created_at: -1 })
      .lean();
    const userIds = [...new Set(invitations.map((invitation) => invitation.created_by))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select("full_name email_normalized")
          .lean()
      : [];
    const userById = new Map(users.map((user) => [user._id, user]));
    const invitationIds = invitations.map((invitation) => invitation._id);
    const redemptions = invitationIds.length
      ? await InvitationRedemption.find({ invitation_id: { $in: invitationIds } })
          .select("invitation_id user_id redeemed_at")
          .sort({ redeemed_at: -1 })
          .lean()
      : [];
    const redemptionCounts = new Map();

    for (const redemption of redemptions) {
      redemptionCounts.set(
        redemption.invitation_id,
        (redemptionCounts.get(redemption.invitation_id) || 0) + 1
      );
    }

    return res.status(200).json({
      referrals: invitations.map((invitation) => {
        const creator = userById.get(invitation.created_by);
        return {
          id: invitation._id,
          creator: creator
            ? { name: creator.full_name, email: creator.email_normalized }
            : null,
          status: invitation.status,
          max_uses: invitation.max_uses,
          uses: redemptionCounts.get(invitation._id) || 0,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          redemptions: redemptions
            .filter((redemption) => redemption.invitation_id === invitation._id)
            .map((redemption) => ({
              user_id: redemption.user_id,
              redeemed_at: redemption.redeemed_at,
            })),
        };
      }),
    });
  } catch (error) {
    console.error("Admin referral list error:", error);
    return res.status(500).json({ message: "Unable to fetch referrals." });
  }
}
