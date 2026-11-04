import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import Application from "../models/Application.js";
import Invitation from "../models/Invitation.js";
import InvitationRedemption from "../models/InvitationRedemption.js";

export const registerUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, referralCode } = req.body || {};

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof password !== "string" ||
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (
      referralCode !== undefined &&
      (typeof referralCode !== "string" || referralCode.trim().length > 100)
    ) {
      return res.status(400).json({
        message: "Please provide a valid referral code.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    const emailNormalized = email.trim().toLowerCase();
    const phoneNormalized = phone.trim();

    // Check if the user already exists
    const existingUser = await User.findOne({
      $or: [
        { email_normalized: emailNormalized },
        { phone_normalized: phoneNormalized },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email or phone number is already registered.",
      });
    }

    // Hash the password before storing it
    const passwordHash = await bcrypt.hash(password, 12);
    const normalizedReferralCode = referralCode?.trim();
    const userData = {
      full_name: fullName.trim(),
      email_normalized: emailNormalized,
      phone_normalized: phoneNormalized,
      password_hash: passwordHash,
      role: "USER",
      account_status: "ACTIVE",
      membership_status: normalizedReferralCode ? "MEMBER" : "NON_MEMBER",
    };
    let user;

    if (normalizedReferralCode) {
      const codeHash = crypto
        .createHash("sha256")
        .update(normalizedReferralCode.toUpperCase())
        .digest("hex");
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const invitation = await Invitation.findOneAndUpdate(
            {
              code_hash: codeHash,
              status: "ACTIVE",
              expires_at: { $gt: new Date() },
              $expr: { $lt: ["$used_count", "$max_uses"] },
            },
            { $inc: { used_count: 1 } },
            { new: true, session }
          );

          if (!invitation) {
            const error = new Error(
              "Invalid, expired, revoked, or fully used referral code."
            );
            error.statusCode = 400;
            throw error;
          }

          [user] = await User.create([userData], { session });
          await InvitationRedemption.create(
            [{ invitation_id: invitation._id, user_id: user._id }],
            { session }
          );
        });
      } finally {
        await session.endSession();
      }
    } else {
      user = await User.create(userData);
    }

    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: user._id,
        fullName: user.full_name,
        email: user.email_normalized,
        role: user.role,
        accountStatus: user.account_status,
        membership_status: user.membership_status,
        remaining_generations: user.remaining_generations,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    // Handles duplicate-key errors if two requests race
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or phone number is already registered.",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Something went wrong during registration.",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const emailNormalized = email.trim().toLowerCase();

    // password_hash may be excluded by default in the User model
    const user = await User.findOne({
      email_normalized: emailNormalized,
    }).select("+password_hash");

    // Use the same message for either invalid credential
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: "Your account is not active.",
      });
    }

    const application = await Application.findOne({ user_id: user._id })
      .sort({ submitted_at: -1 })
      .select("application_status");

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        fullName: user.full_name,
        email: user.email_normalized,
        role: user.role,
        accountStatus: user.account_status,
        membership_status : user.membership_status,
        remaining_generations: user.remaining_generations,
        application_status: application?.application_status || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong during login.",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user || user.account_status !== "ACTIVE") {
      return res.status(404).json({
        message: "User not found or account is inactive.",
      });
    }

    const application = await Application.findOne({ user_id: user._id })
      .sort({ submitted_at: -1 })
      .select("application_status");

    return res.status(200).json({
      user: {
        id: user._id,
        fullName: user.full_name,
        email: user.email_normalized,
        role: user.role,
        accountStatus: user.account_status,
        membership_status : user.membership_status,
        remaining_generations: user.remaining_generations,
        application_status: application?.application_status || null,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Unable to fetch user details.",
    });
  }
};