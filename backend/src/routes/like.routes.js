import { Router } from "express";
import {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
} from "../controllers/like.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// All like routes require authentication
router.use(verifyJWT);

// ─────────────────────────────────────────────
// /api/v1/likes
// ─────────────────────────────────────────────

router.route("/toggle/v/:videoId").post(toggleVideoLike);       // POST /likes/toggle/v/:videoId
router.route("/toggle/c/:commentId").post(toggleCommentLike);   // POST /likes/toggle/c/:commentId
router.route("/toggle/t/:tweetId").post(toggleTweetLike);       // POST /likes/toggle/t/:tweetId

router.route("/videos").get(getLikedVideos);                    // GET  /likes/videos

export default router;