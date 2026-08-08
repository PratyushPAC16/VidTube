import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // cloudinary URL
            required: true
        },
        videoFilePublicId: {
            type: String, // cloudinary public_id — needed for reliable deletion
            required: true
        },
        thumbnail: {
            type: String, // cloudinary URL
            required: true
        },
        thumbnailPublicId: {
            type: String, // cloudinary public_id — needed for reliable deletion
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: Number, // Cloudinary returns this automatically for video uploads
            required: true
        },
        // ── Technical metadata captured from Cloudinary upload response ──
        format: {
            type: String  // container format, e.g. "mp4", "webm" (Cloudinary: response.format)
        },
        bitrate: {
            type: Number  // bits per second (Cloudinary: response.bit_rate)
        },
        width: {
            type: Number  // frame width in pixels (Cloudinary: response.width)
        },
        height: {
            type: Number  // frame height in pixels (Cloudinary: response.height)
        },
        fileSize: {
            type: Number  // original file size in bytes (Cloudinary: response.bytes)
        },
        // ── Quality renditions (on-the-fly Cloudinary transformation URLs) ──
        // Generated at upload time using Cloudinary's URL-based transformations.
        // Each entry is a ready-to-use HTTPS URL; no pre-processing pipeline needed.
        qualityRenditions: [
            {
                label:  { type: String }, // "480p" | "720p" | "1080p"
                height: { type: Number }, // target height in pixels
                url:    { type: String }  // signed-free CDN URL with transformation params
            }
        ],
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
