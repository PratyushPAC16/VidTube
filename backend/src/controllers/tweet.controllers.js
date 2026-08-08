import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// ─────────────────────────────────────────────
// CREATE TWEET
// ─────────────────────────────────────────────
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required!");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    });

    if (!tweet) {
        throw new ApiError(500, "Something went wrong while creating the tweet!");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "Tweet created successfully!"));
});


// ─────────────────────────────────────────────
// GET USER TWEETS
// ─────────────────────────────────────────────
const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId!");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            // Join owner info so the client knows who wrote each tweet
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
            // Newest tweets first
            $sort: { createdAt: -1 }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "User tweets fetched successfully!"));
});


// ─────────────────────────────────────────────
// UPDATE TWEET
// ─────────────────────────────────────────────
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId!");
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required!");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found!");
    }

    // Only the owner can update their tweet
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet!");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: { content }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully!"));
});


// ─────────────────────────────────────────────
// DELETE TWEET
// ─────────────────────────────────────────────
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId!");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found!");
    }

    // Only the owner can delete their tweet
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet!");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted successfully!"));
});


// ─────────────────────────────────────────────
// GET SUBSCRIPTION FEED TWEETS
// Returns tweets from all channels the logged-in user subscribes to
// ─────────────────────────────────────────────
const getSubscriptionFeed = asyncHandler(async (req, res) => {
    // 1. Find all channel IDs that the current user is subscribed to
    const { Subscription } = await import("../models/subscription.models.js");

    const subscriptions = await Subscription.find({ subscriber: req.user._id }).select("channel");
    const channelIds = subscriptions.map((s) => s.channel);

    if (channelIds.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "No subscriptions found!"));
    }

    // 2. Fetch tweets from those channels, sorted newest first
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: { $in: channelIds }
            }
        },
        {
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
            $sort: { createdAt: -1 }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Subscription feed fetched successfully!"));
});


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    getSubscriptionFeed
};