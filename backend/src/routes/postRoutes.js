import express from "express";
import {
  addPostComment,
  createPost,
  getPosts,
  togglePostLike,
} from "../controller/postController.js";
import {
  authenticate,
  authenticateOptional,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Anyone can view artwork
router.get("/", authenticateOptional, getPosts);

router.put("/:postId/like", authenticate, togglePostLike);
router.post("/:postId/comments", authenticate, addPostComment);
router.post("/", authenticate, createPost);

export default router;
