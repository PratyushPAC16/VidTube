import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// ─────────────────────────────────────────────
// HELPER — reusable toggle logic
// Avoids repeating the same findOne → delete/create pattern 3 times
// ─────────────────────────────────────────────
const toggleLike = async (filterQuery) => {
    const existingLike = await Like.findOne(filterQuery);

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return { liked: false };
    } else {
        await Like.create(filterQuery);
        return { liked: true };
    }
};


// ─────────────────────────────────────────────
// TOGGLE LIKE ON A VIDEO
// ─────────────────────────────────────────────
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    const result = await toggleLike({
        video: videoId,
        likedBy: req.user._id
    });

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            result,
            result.liked ? "Video liked successfully!" : "Video unliked successfully!"
        ));
});


// ─────────────────────────────────────────────
// TOGGLE LIKE ON A COMMENT
// ─────────────────────────────────────────────
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId!");
    }

    const result = await toggleLike({
        comment: commentId,
        likedBy: req.user._id
    });

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            result,
            result.liked ? "Comment liked successfully!" : "Comment unliked successfully!"
        ));
});


// ─────────────────────────────────────────────
// TOGGLE LIKE ON A TWEET
// ─────────────────────────────────────────────
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId!");
    }

    const result = await toggleLike({
        tweet: tweetId,
        likedBy: req.user._id
    });

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            result,
            result.liked ? "Tweet liked successfully!" : "Tweet unliked successfully!"
        ));
});


// ─────────────────────────────────────────────
// GET ALL LIKED VIDEOS BY THE LOGGED IN USER
// ─────────────────────────────────────────────
const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            // Match all like documents by this user that are for a video
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true, $ne: null }
            }
        },
        {
            // Join full video details
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        // Join video owner details inside the video lookup
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
            $addFields: {
                video: { $first: "$video" }
            }
        },
        {
            // Filter out any likes where the video was deleted
            $match: {
                video: { $exists: true, $ne: null }
            }
        },
        {
            $project: {
                video: 1,
                createdAt: 1  // when the user liked it
            }
        },
        {
            $sort: { createdAt: -1 } // most recently liked first
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                likedVideoCount: likedVideos.length,
                likedVideos
            },
            "Liked videos fetched successfully!"
        ));
});


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
};