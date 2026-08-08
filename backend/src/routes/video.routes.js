import { Router } from "express";
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getVideoStats
} from "../controllers/video.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// All video routes require authentication
router.use(verifyJWT);

// ─────────────────────────────────────────────
// /api/v1/videos
// ─────────────────────────────────────────────

router.route("/")
    .get(getAllVideos)       // GET  /videos?page=1&limit=10&query=&sortBy=&sortType=&userId=
    .post(
        upload.fields([     // POST /videos  — publish a new video
            {
                name: "videoFile",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]),
        publishAVideo
    );

// ─────────────────────────────────────────────
// /api/v1/videos/stats  (must be BEFORE /:videoId so "stats" isn't treated as an id)
// ─────────────────────────────────────────────

router.route("/stats")
    .get(getVideoStats); // GET /videos/stats — platform dashboard metrics

// ─────────────────────────────────────────────
// /api/v1/videos/:videoId
// ─────────────────────────────────────────────

router.route("/:videoId")
    .get(getVideoById)      // GET    /videos/:videoId
    .patch(
        upload.single("thumbnail"),  // PATCH  /videos/:videoId — update title, description, thumbnail
        updateVideo
    )
    .delete(deleteVideo);   // DELETE /videos/:videoId

// ─────────────────────────────────────────────
// /api/v1/videos/toggle/publish/:videoId
// ─────────────────────────────────────────────

router.route("/toggle/publish/:videoId")
    .patch(togglePublishStatus); // PATCH /videos/toggle/publish/:videoId

export default router;