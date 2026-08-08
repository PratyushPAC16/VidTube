import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found!");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access or refresh Tokens!")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    // validation
    // Bug fix (Bug 7): field?.trim() === "" misses undefined (missing body keys).
    // !field?.trim() correctly catches both undefined and empty string.
    if ([fullname, email, username, password].some((field) => !field?.trim())) {
        // .some() makes sure tht if any field is empty return the error.
        throw new ApiError(400, "all fields are required!")
    }

    // checking if the user already exists.
    const existedUser = await User.findOne({
        $or: [{ username }, { email }] // find either on the basis of username or email i.e. if anyone of that matches.
    })

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists!")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path; // we will get where multer stored the file on the disc.
    const coverLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(401, "Avatar file is missing!")
    }



    /* const avatar=await uploadOnCloudinary(avatarLocalPath); // We are storing the response here.
    let coverImage="";
     if(coverLocalPath){
        coverImage=await uploadOnCloudinary(coverLocalPath); // Cover Image is not compulsory.
    } */ // We can write better upload code than this.

    let avatar;

    try {
        avatar = await uploadOnCloudinary(avatarLocalPath);
        console.log("Uploaded", avatar);

    } catch (error) {
        console.log("Error uploading avatar", error);
        throw new ApiError(500, "failed to load avtar!")
    }

    let coverImage;

    try {
        coverImage = await uploadOnCloudinary(coverLocalPath);
        console.log("Uploaded", coverImage);

    } catch (error) {
        console.log("Error uploading coverImage", error);

        console.log("FILES:", req.files);// req.files contain all the uploaded files, grouped by file name. ? search GPT to find out how it looks like.
        console.log("avatar path:", avatarLocalPath);
        console.log("cover path:", coverLocalPath);

        throw new ApiError(500, "failed to load cover!")
    }

    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })

        const createdUser = await User.findById(user._id).select("-password -refreshToken")

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering a user.")
        }

        return res
            .status(201)
            .json(new ApiResponse(201, createdUser, "User created successfully!"))
    } catch (error) {
        console.log("User creation failed", error);
        console.error("User creation failed:", error.message)

        if (avatar) {
            await deleteFromCloudinary(avatar.public_id);// If user creation failed then we have to delete the avatar and cover image uploaded on cloudinary.
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage.public_id);
        }

        throw new ApiError(500, "Something went wrong while registering a user and the images were deleted.")
    }
})

const loginUser = asyncHandler(async (req, res) => {
    // get Data from the body
    const { email, username, password } = req.body

    // validation
    // Bug fix (Bug 6): original code only checked !email, breaking username-only
    // login and failing to validate password presence at all.
    if (!password) {
        throw new ApiError(400, "Password is required!");
    }
    if (!email && !username) {
        throw new ApiError(400, "Email or username is required!");
    }
    const user = await User.findOne({
        $or: [{ username }, { email }] // find either on the basis of username or email i.e. if anyone of that matches.
    })
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(403, "Invalid Password! try agin.");

    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    if (!loggedInUser) {
        throw new ApiError(401, "logIn failed!")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // Bug fix (Bug 4): SameSite=None requires Secure=true (browser spec).
        // In development secure is false, so browsers silently reject the cookie.
        // Use "lax" in dev (same-site requests work fine) and "none" only in prod.
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, loggedInUser, "User loggedIn successfully!"))

    // In case of a mobile app
    /*
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"User loggedIn successfully!")) 
     */
})

const logoutUser = asyncHandler(async (req, res) => {
    // auth.middleware code is responsible for adding the user data with the request which we can use to do the logout

    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined, // this works better in mongoose
            }
        },
        { new: true }// This makes sure that it will give me the fresh information

    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User logged out successfully."))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;// refresh token may come in body in case of mobile application
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh Token is required!")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);// Now we will get access to the payload of the token
        const user = await User.findById(decodedToken?._id); //? is for what if the decoded token cannot provide us with _id
        if (!user) {
            throw new ApiError(404, "Invalid refrsh token!");
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token!")
        }
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        }
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);
        // Bug fix (Bug 5): the assignment below was dead code — generateAccessAndRefreshToken
        // already persists the new refreshToken to the DB via user.save() internally.
        // Removed to avoid misleading future maintainers.
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "AccessToken refresh successfully!"));

    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing the accessToken!");
    }
})

// CRUD operations in MERN backend

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Bug fix (Bug 8): no validation existed — passing undefined to bcrypt.compare
    // throws an unhandled error resulting in a misleading 500.
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required!");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);// returns a boolean value
    if (!isPasswordValid) {
        throw new ApiError(401, "Old Password is Incorrect!")
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password was successfully changed!"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user data"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    // Now it depends on you that which kind of information from the user You want to update.
    const { fullname, email } = req.body;
    if (!fullname || !email) {
        throw new ApiError(401, "fullname or email is a required field.")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email,
            }
        }, { new: true }
    ).select("-password -refreshToken")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated!"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    console.log(req.file);
    console.log(req.files);
    if (!avatarLocalPath) {
        throw new ApiError(401, "File is required!")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong while loading the avatar!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200).json(new ApiResponse(200, user, "Avatar updated successfully."))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverLocalPath = req.file?.path;
    if (!coverLocalPath) {
        throw new ApiError(401, "File is required!")
    }
    const coverImage = await uploadOnCloudinary(coverLocalPath);
    if (!coverImage.url) {
        throw new ApiError(500, "Something went wrong while loading the avatar.")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image is updated."));
})
// Sections where mongoDB aggregation pipelines will be used.
const getUserChannelProfile = asyncHandler(async (req, res) => {
    //req.params is responsible for getting us something from the url that the user is visiting.
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required!")
    }
    // Now we will use this username to enquire something from the databse.
    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelsSubscribedTo: {
                        $size: "$subscribedTo"
                    },
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
                // Project only the necessary data
                $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                    subscribersCount: 1,
                    channelsSubscribedTo: 1,
                    isSubscribed: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ]
    )

    console.log(channel[0]);


    if (!channel?.length) {
        throw new ApiError(404, 'Channel not found!')
    }

    return res.status(200).json(new ApiResponse(
        200,
        channel[0],
        "Channel profile fetched successfully."
    ))


})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {// We do this nesting so that inside each video we add the owners information.
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: { // Here we dont want to return the whole array as for every video there is only owner
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if (!user.length) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory, "Watch History fetched successfully!"))
})



// Try to write a delete account controller later.
export {
    registerUser, loginUser, refreshAccessToken, logoutUser, changeCurrentPassword, getCurrentUser, updateAccountDetails,
    updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory
}