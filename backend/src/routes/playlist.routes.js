import { Router } from "express";
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
} from "../controllers/playlist.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// All playlist routes require authentication
router.use(verifyJWT);

// ─────────────────────────────────────────────
// /api/v1/playlists
// ─────────────────────────────────────────────

router.route("/")
    .post(createPlaylist);                          // POST   /playlists               — create a playlist

router.route("/user/:userId")
    .get(getUserPlaylists);                         // GET    /playlists/user/:userId   — get all playlists of a user

router.route("/:playlistId")
    .get(getPlaylistById)                           // GET    /playlists/:playlistId    — get playlist by id
    .patch(updatePlaylist)                          // PATCH  /playlists/:playlistId    — update name/description
    .delete(deletePlaylist);                        // DELETE /playlists/:playlistId    — delete playlist

router.route("/add/:videoId/:playlistId")
    .patch(addVideoToPlaylist);                     // PATCH  /playlists/add/:videoId/:playlistId

router.route("/remove/:videoId/:playlistId")
    .patch(removeVideoFromPlaylist);                // PATCH  /playlists/remove/:videoId/:playlistId

export default router;