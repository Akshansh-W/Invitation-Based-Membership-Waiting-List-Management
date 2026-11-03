import mongoose from "mongoose";
import Post from "../models/Posts.js";
import User from "../models/User.js";
import { randomUUID } from "node:crypto";

function getPostIdCandidates(postId) {
  const candidates = [postId];

  if (
    /^[a-f\d]{24}$/i.test(postId) &&
    mongoose.Types.ObjectId.isValid(postId)
  ) {
    candidates.push(new mongoose.Types.ObjectId(postId));
  }

  return candidates;
}

// GET /api/posts
// Public endpoint: fetch artwork for the homepage
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      posts: posts.map((post) => ({
        id: post._id,
        title: post.title,
        artist: post.artist,
        description: post.description,
        image: post.image,
        likes: post.likes,
        likedByCurrentUser: Boolean(
          req.user?.userId && post.liked_by?.includes(req.user.userId)
        ),
        createdAt: post.createdAt,
        comments: post.comments,
      })),
    });
  } catch (error) {
    console.error("Fetch posts error:", error);

    return res.status(500).json({
      message: "Unable to fetch artwork posts.",
    });
  }
};

export const togglePostLike = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "account_status full_name"
    );

    if (!user || user.account_status !== "ACTIVE") {
      return res.status(403).json({ message: "Your account is not active." });
    }

    const result = await Post.collection.findOneAndUpdate(
      { _id: { $in: getPostIdCandidates(req.params.postId) } },
      [
        {
          $set: {
            liked_by: {
              $cond: [
                {
                  $in: [
                    req.user.userId,
                    { $ifNull: ["$liked_by", []] },
                  ],
                },
                {
                  $filter: {
                    input: { $ifNull: ["$liked_by", []] },
                    as: "userId",
                    cond: { $ne: ["$$userId", req.user.userId] },
                  },
                },
                {
                  $setUnion: [
                    { $ifNull: ["$liked_by", []] },
                    [req.user.userId],
                  ],
                },
              ],
            },
            likes: {
              $max: [
                0,
                {
                  $add: [
                    { $ifNull: ["$likes", 0] },
                    {
                      $cond: [
                        {
                          $in: [
                            req.user.userId,
                            { $ifNull: ["$liked_by", []] },
                          ],
                        },
                        -1,
                        1,
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
      { returnDocument: "after" }
    );
    const post = result?.value || result;

    if (!post) {
      return res.status(404).json({ message: "Artwork post not found." });
    }

    return res.status(200).json({
      liked: post.liked_by.includes(req.user.userId),
      likes: post.likes,
    });
  } catch (error) {
    console.error("Update post like error:", error);
    return res.status(500).json({ message: "Unable to update your like." });
  }
};

export const addPostComment = async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

  if (!text) {
    return res.status(400).json({ message: "Comment text is required." });
  }

  if (text.length > 1000) {
    return res.status(400).json({
      message: "Comments must be 1000 characters or fewer.",
    });
  }

  try {
    const user = await User.findById(req.user.userId).select(
      "account_status full_name"
    );

    if (!user || user.account_status !== "ACTIVE") {
      return res.status(403).json({ message: "Your account is not active." });
    }

    const comment = {
      _id: randomUUID(),
      user_id: user._id,
      author_name: user.full_name,
      text,
      created_at: new Date(),
    };
    const result = await Post.collection.findOneAndUpdate(
      { _id: { $in: getPostIdCandidates(req.params.postId) } },
      {
        $push: {
          comments: comment,
        },
      },
      {
        returnDocument: "after",
        projection: { comments: 1 },
      }
    );
    const post = result?.value || result;

    if (!post) {
      return res.status(404).json({ message: "Artwork post not found." });
    }

    return res.status(201).json({
      message: "Comment added.",
      comment: post.comments[post.comments.length - 1],
      comment_count: post.comments.length,
    });
  } catch (error) {
    console.error("Add post comment error:", error);
    return res.status(500).json({ message: "Unable to add your comment." });
  }
};

// POST /api/posts
// Only active members can publish artwork
export const createPost = async (req, res) => {
  try {
    const { title, description, image } = req.body;

    // Validate required fields
    if (
      typeof title !== "string" ||
      typeof description !== "string" ||
      typeof image !== "string" ||
      !title.trim() ||
      !description.trim() ||
      !image.trim()
    ) {
      return res.status(400).json({
        message: "Title, description, and image URL are required.",
      });
    }

    if (title.trim().length > 150 ||
        description.trim().length > 1000) {
      return res.status(400).json({
        message: "Title or description exceeds the allowed length.",
      });
    }

    // Validate image URL
    let imageUrl;

    try {
      imageUrl = new URL(image.trim());
    } catch {
      return res.status(400).json({
        message: "Please provide a valid image URL.",
      });
    }

    if (!["http:", "https:"].includes(imageUrl.protocol)) {
      return res.status(400).json({
        message: "Image URL must use HTTP or HTTPS.",
      });
    }

    // Find the authenticated user
    const user = await User.findById(req.user.userId);

    if (!user || user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: "Your account is not active.",
      });
    }

    // Membership check
    if (user.membership_status !== "MEMBER") {
      return res.status(403).json({
        message: "You must be an ArtSpace member to publish artwork.",
      });
    }

    // Never trust artist name or likes sent by the frontend
    const post = await Post.create({
      title: title.trim(),
      artist: user.full_name,
      description: description.trim(),
      image: imageUrl.href,
      user_id: user._id,
    });

    return res.status(201).json({
      message: "Artwork published successfully.",
      post: {
        id: post._id,
        title: post.title,
        artist: post.artist,
        description: post.description,
        image: post.image,
        likes: post.likes,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.error("Create post error:", error);

    return res.status(500).json({
      message: "Unable to publish artwork.",
    });
  }
};
