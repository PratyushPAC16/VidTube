import { Router } from "express";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// All comment routes require authentication
router.use(verifyJWT);

// ─────────────────────────────────────────────
// /api/v1/comments
// ─────────────────────────────────────────────

router.route("/:videoId")
    .get(getVideoComments)  // GET  /comments/:videoId       — get paginated comments for a video
    .post(addComment);      // POST /comments/:videoId       — add a comment to a video

router.route("/c/:commentId")
    .patch(updateComment)   // PATCH  /comments/c/:commentId — update a comment
    .delete(deleteComment); // DELETE /comments/c/:commentId — delete a comment

export default router;
