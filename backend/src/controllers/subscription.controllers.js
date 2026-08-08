import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// ─────────────────────────────────────────────
// TOGGLE SUBSCRIPTION
// Subscribe if not already subscribed, unsubscribe if already subscribed
// ─────────────────────────────────────────────
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId!");
    }

    // A user cannot subscribe to themselves
    if (channelId === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel!");
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found!");
    }

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    });

    if (existingSubscription) {
        // Already subscribed — so unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully!"));
    } else {
        // Not subscribed — so subscribe
        await Subscription.create({
            subscriber: req.user._id,
            channel: channelId
        });

        return res
            .status(200)
            .json(new ApiResponse(200, { subscribed: true }, "Subscribed successfully!"));
    }
});


// ─────────────────────────────────────────────
// GET SUBSCRIBERS OF A CHANNEL
// Returns list of users who have subscribed to a given channel
// ─────────────────────────────────────────────
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId!");
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found!");
    }

    const subscribers = await Subscription.aggregate([
        {
            // Match all documents where this channelId is the channel
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            // Join subscriber's user details
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
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
                subscriber: { $first: "$subscriber" }
            }
        },
        {
            // Return only the subscriber info and when they subscribed
            $project: {
                subscriber: 1,
                createdAt: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                subscriberCount: subscribers.length,
                subscribers
            },
            "Subscribers fetched successfully!"
        ));
});


// ─────────────────────────────────────────────
// GET CHANNELS SUBSCRIBED TO BY A USER
// Returns list of channels a given user has subscribed to
// ─────────────────────────────────────────────
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriberId!");
    }

    const subscriber = await User.findById(subscriberId);
    if (!subscriber) {
        throw new ApiError(404, "User not found!");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            // Match all documents where this user is the subscriber
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            // Join channel's user details
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
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
                channel: { $first: "$channel" }
            }
        },
        {
            // Return only the channel info and when they subscribed
            $project: {
                channel: 1,
                createdAt: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                subscribedChannelCount: subscribedChannels.length,
                subscribedChannels
            },
            "Subscribed channels fetched successfully!"
        ));
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};