import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// ─────────────────────────────────────────────
// CREATE PLAYLIST
// ─────────────────────────────────────────────
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name?.trim() || !description?.trim()) {
        throw new ApiError(400, "Name and description are required!");
    }

    const playlist = await Playlist.create({
        name,
        description,
        videos: [],
        owner: req.user._id
    });

    if (!playlist) {
        throw new ApiError(500, "Something went wrong while creating the playlist!");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully!"));
});


// ─────────────────────────────────────────────
// GET ALL PLAYLISTS OF A USER
// ─────────────────────────────────────────────
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId!");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            // Get total video count and first 3 thumbnails for a preview
            $addFields: {
                videoCount: { $size: "$videos" },
                previewThumbnails: { $slice: ["$videos", 3] } // first 3 video ids for thumbnail preview
            }
        },
        {
            // Lookup those first 3 videos to get their thumbnails
            $lookup: {
                from: "videos",
                localField: "previewThumbnails",
                foreignField: "_id",
                as: "previewThumbnails",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videoCount: 1,
                videos: 1,
                previewThumbnails: 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully!"));
});


// ─────────────────────────────────────────────
// GET PLAYLIST BY ID (with full video details)
// ─────────────────────────────────────────────
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            // Join full details of all videos in the playlist
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        // Only return published videos
                        $match: { isPublished: true }
                    },
                    {
                        // Nested lookup — get each video's owner info
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    },
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            // Join playlist owner details
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                videoCount: { $size: "$videos" }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                videoCount: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    if (!playlist.length) {
        throw new ApiError(404, "Playlist not found!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully!"));
});


// ─────────────────────────────────────────────
// ADD VIDEO TO PLAYLIST
// ─────────────────────────────────────────────
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found!");
    }

    // Only the owner can add videos to their playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to modify this playlist!");
    }

    // Prevent duplicate videos in the playlist
    // Bug fix: playlist.videos contains ObjectId objects; .includes() uses ===
    // which never matches a plain string. Use .some() with .toString() instead.
    if (playlist.videos.some(id => id.toString() === videoId)) {
        throw new ApiError(409, "Video is already in the playlist!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push: { videos: videoId }  // $push appends to the videos array
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully!"));
});


// ─────────────────────────────────────────────
// REMOVE VIDEO FROM PLAYLIST
// ─────────────────────────────────────────────
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found!");
    }

    // Only the owner can remove videos from their playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to modify this playlist!");
    }

    // Check the video actually exists in the playlist before trying to remove it
    // Bug fix: same ObjectId-vs-string issue as addVideoToPlaylist.
    if (!playlist.videos.some(id => id.toString() === videoId)) {
        throw new ApiError(404, "Video not found in the playlist!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: new mongoose.Types.ObjectId(videoId) }  // $pull removes matching element from array
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully!"));
});


// ─────────────────────────────────────────────
// DELETE PLAYLIST
// ─────────────────────────────────────────────
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found!");
    }

    // Only the owner can delete their playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist!");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully!"));
});


// ─────────────────────────────────────────────
// UPDATE PLAYLIST (name and/or description)
// ─────────────────────────────────────────────
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId!");
    }

    if (!name?.trim() && !description?.trim()) {
        throw new ApiError(400, "At least one field (name or description) is required to update!");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found!");
    }

    // Only the owner can update their playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name?.trim() || playlist.name,
                description: description?.trim() || playlist.description
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully!"));
});


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};