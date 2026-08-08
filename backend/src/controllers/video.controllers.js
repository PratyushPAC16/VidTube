import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary, generateQualityRenditions } from "../utils/cloudinary.js";



// ─────────────────────────────────────────────
// GET ALL VIDEOS (with search, sort, pagination)
// ─────────────────────────────────────────────
const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,           // search term matched against title and description
        sortBy = "createdAt",
        sortType = "desc",
        userId           // optionally filter videos by a specific owner
    } = req.query;

    const pipeline = [];

    // 1. Filter by owner if userId is provided
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId!");
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // 2. Full-text search on title and description
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        });
    }

    // 3. Only return published videos
    pipeline.push({
        $match: { isPublished: true }
    });

    // 4. Lookup owner details
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
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
                owner: { $first: "$ownerDetails" }
            }
        }
    );

    // 5. Sort
    const sortOrder = sortType === "asc" ? 1 : -1;
    pipeline.push({
        $sort: { [sortBy]: sortOrder }
    });

    // 6. Remove raw lookup array from output
    pipeline.push({
        $project: {
            ownerDetails: 0,
            videoFilePublicId: 0, // don't expose internal public_ids to the client
            thumbnailPublicId: 0
        }
    });

    // 7. Paginate using mongoose-aggregate-paginate-v2
    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully!"));
});


// ─────────────────────────────────────────────
// PUBLISH A VIDEO
// ─────────────────────────────────────────────
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required!");
    }

    // Get local file paths set by multer
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required!");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required!");
    }

    // Upload video to Cloudinary
    let videoFile;
    try {
        videoFile = await uploadOnCloudinary(videoLocalPath);
        if (!videoFile) throw new Error();
    } catch (error) {
        throw new ApiError(500, "Failed to upload video file!");
    }

    // Upload thumbnail to Cloudinary
    let thumbnail;
    try {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail) throw new Error();
    } catch (error) {
        // Rollback video upload if thumbnail fails
        await deleteFromCloudinary(videoFile.public_id, "video");
        throw new ApiError(500, "Failed to upload thumbnail!");
    }

    // Compute quality rendition URLs (pure URL generation — no extra API calls).
    // Only renditions whose height ≤ source height are included (no upscaling).
    const qualityRenditions = generateQualityRenditions(
        videoFile.public_id,
        videoFile.format || "mp4",
        videoFile.height
    );

    // Save video document to DB
    try {
        const video = await Video.create({
            videoFile: videoFile.url,
            videoFilePublicId: videoFile.public_id,  // store for reliable deletion later
            thumbnail: thumbnail.url,
            thumbnailPublicId: thumbnail.public_id,  // store for reliable deletion later
            title,
            description,
            duration: videoFile.duration,      // Cloudinary returns duration for video files
            // ── Technical metadata from Cloudinary upload response ──
            format:   videoFile.format,         // container format ("mp4", "webm", ...)
            bitrate:  videoFile.bit_rate,       // bits per second
            width:    videoFile.width,          // frame width in pixels
            height:   videoFile.height,         // frame height in pixels
            fileSize: videoFile.bytes,          // original file size in bytes
            // ── Quality renditions (on-the-fly Cloudinary transformation URLs) ──
            qualityRenditions,
            owner: req.user._id,
            isPublished: true
        });

        return res
            .status(201)
            .json(new ApiResponse(201, video, "Video published successfully!"));
    } catch (error) {
        // Rollback both Cloudinary uploads if DB write fails
        await deleteFromCloudinary(videoFile.public_id, "video");
        await deleteFromCloudinary(thumbnail.public_id);
        throw new ApiError(500, "Something went wrong while publishing the video!");
    }
});


// ─────────────────────────────────────────────
// GET VIDEO BY ID
// ─────────────────────────────────────────────
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    // Aggregation to fetch video with owner info, likes, and subscription status
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        // Lookup likes for this video
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        // Lookup owner details with subscriber info
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        // Count subscribers for the owner
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscribers" },
                            isSubscribed: {
                                $cond: {
                                    // Bug fix (Bug 10): explicitly cast to ObjectId for
                                    // reliable BSON comparison inside the aggregation pipeline.
                                    if: { $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        // Bug fix (Bug 10): same explicit ObjectId cast.
                        if: { $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFilePublicId: 0,
                thumbnailPublicId: 0,
                likes: 0 // don't send raw likes array to client
            }
        }
    ]);

    if (!video.length) {
        throw new ApiError(404, "Video not found!");
    }

    // Increment view count
    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    });

    // Add to the user's watch history (addToSet avoids duplicates)
    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { watchHistory: videoId } // addToSet only adds the item if it already does not exist.
    });

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully!"));
});


// ─────────────────────────────────────────────
// UPDATE VIDEO (title, description, thumbnail)
// ─────────────────────────────────────────────
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    if (!title?.trim() && !description?.trim() && !req.file) {
        throw new ApiError(400, "At least one field (title, description, thumbnail) is required to update!");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found!");
    }

    // Only the owner can update
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video!");
    }

    // Handle thumbnail update
    let newThumbnailUrl = video.thumbnail;// Store the thumbnail and its publicId.
    let newThumbnailPublicId = video.thumbnailPublicId;

    if (req.file) {
        const thumbnailLocalPath = req.file.path;

        const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!uploadedThumbnail?.url) {
            throw new ApiError(500, "Failed to upload new thumbnail!");
        }

        // Delete old thumbnail from Cloudinary using stored public_id
        await deleteFromCloudinary(video.thumbnailPublicId);// We are getting the old public Id here fro schema.

        newThumbnailUrl = uploadedThumbnail.url;
        newThumbnailPublicId = uploadedThumbnail.public_id;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title?.trim() || video.title,
                description: description?.trim() || video.description,
                thumbnail: newThumbnailUrl,
                thumbnailPublicId: newThumbnailPublicId
            }
        },
        { new: true }
    ).select("-videoFilePublicId -thumbnailPublicId"); // don't expose public_ids

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully!"));
});


// ─────────────────────────────────────────────
// DELETE VIDEO
// ─────────────────────────────────────────────
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found!");
    }

    // Only the owner can delete
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video!");
    }

    // Delete from Cloudinary using stored public_ids (reliable regardless of folder structure)
    await deleteFromCloudinary(video.videoFilePublicId, "video");
    await deleteFromCloudinary(video.thumbnailPublicId);

    // Delete from DB
    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully!"));
});


// ─────────────────────────────────────────────
// TOGGLE PUBLISH STATUS
// ─────────────────────────────────────────────
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found!");
    }

    // Only the owner can toggle publish status
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to perform this action!");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            { isPublished: updatedVideo.isPublished },
            `Video is now ${updatedVideo.isPublished ? "published" : "unpublished"}!`
        ));
});


// ─────────────────────────────────────────────
// VIDEO STATS / DASHBOARD
// ─────────────────────────────────────────────
const getVideoStats = asyncHandler(async (req, res) => {
    // ASSUMPTION: upload failures are not persisted to the DB (they roll back both
    // Cloudinary uploads and never reach Video.create). Therefore:
    //   • "Upload successes" = total video documents in the collection.
    //   • "Upload failures"  = cannot be derived here without a separate audit log.
    // Both facts are exposed clearly in the API response so the UI can label them accurately.

    const stats = await Video.aggregate([
        {
            $facet: {
                // ─ 1. Total video count ────────────────────────────────────
                totals: [
                    { $count: "totalVideos" }
                ],

                // ─ 2. Published vs unpublished breakdown ────────────────────
                publishStats: [
                    {
                        $group: {
                            _id: "$isPublished",
                            count: { $sum: 1 }
                        }
                    }
                ],

                // ─ 3. Platform-wide averages ────────────────────────────
                averages: [
                    {
                        $group: {
                            _id: null,
                            avgFileSize: { $avg: "$fileSize" },
                            avgDuration: { $avg: "$duration" },
                            avgBitrate:  { $avg: "$bitrate" }
                        }
                    }
                ],

                // ─ 4. 20 most recent uploads with full technical metadata ────
                recentUploads: [
                    { $sort: { createdAt: -1 } },
                    { $limit: 20 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                { $project: { username: 1, avatar: 1 } }
                            ]
                        }
                    },
                    {
                        $addFields: { owner: { $first: "$owner" } }
                    },
                    {
                        $project: {
                            videoFilePublicId: 0,  // never expose internal public_ids
                            thumbnailPublicId: 0
                        }
                    }
                ]
            }
        }
    ]);

    const raw = stats[0];

    const totalVideos     = raw.totals[0]?.totalVideos ?? 0;
    const publishedCount  = raw.publishStats.find(s => s._id === true)?.count  ?? 0;
    const unpublishedCount = raw.publishStats.find(s => s._id === false)?.count ?? 0;
    const avg             = raw.averages[0] ?? {};

    return res.status(200).json(new ApiResponse(200, {
        // ─ Counts ─
        totalVideos,
        uploadSuccessCount:   totalVideos,   // see ASSUMPTION note above
        uploadFailureCount:   null,           // not trackable without an audit-log collection
        publishedCount,
        unpublishedCount,

        // ─ Averages ─
        averageFileSizeBytes: Math.round(avg.avgFileSize ?? 0),
        averageDurationSecs:  Math.round((avg.avgDuration ?? 0) * 100) / 100,
        averageBitrateBps:    Math.round(avg.avgBitrate  ?? 0),

        // ─ Recent uploads table ─
        recentUploads: raw.recentUploads
    }, "Video stats fetched successfully!"));
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getVideoStats
};