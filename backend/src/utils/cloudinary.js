import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Force HTTPS URLs
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log("File uploaded on cloudinary. File src: " + response.secure_url);

        // Delete the local file after successful upload
        fs.unlinkSync(localFilePath);

        // Ensure we always use HTTPS
        response.url = response.secure_url || response.url.replace("http://", "https://");

        return response;
    } catch (error) {
        console.log("Error on cloudinary", error);
        // Guard against ENOENT: only unlink if the file still exists
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};


const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType  // "image" by default, pass "video" for video files
        });
        console.log("Deleted from cloudinary!", publicId);
        return result; // returns { result: 'ok' } on success
    } catch (error) {
        console.log("Error deleting from cloudinary", error);
        return null;
    }
};


/**
 * generateQualityRenditions
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives on-the-fly Cloudinary transformation URLs for multiple quality
 * levels (480p, 720p, 1080p) from an already-uploaded video's public_id.
 *
 * No additional API calls or uploads are needed — Cloudinary transcodes the
 * rendition on the first CDN request and caches it automatically.
 *
 * Only renditions whose target height is ≤ the source video height are
 * included, so we never artificially upscale a 480p source to 720p.
 *
 * @param {string} publicId   - Cloudinary public_id of the uploaded video
 * @param {string} format     - Container format e.g. "mp4" (from upload response)
 * @param {number} sourceHeight - Original video height in pixels
 * @returns {Array<{ label: string, height: number, url: string }>}
 */
const generateQualityRenditions = (publicId, format = "mp4", sourceHeight = Infinity) => {
    const RENDITIONS = [
        { label: "480p",  height: 480  },
        { label: "720p",  height: 720  },
        { label: "1080p", height: 1080 }
    ];

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    return RENDITIONS
        .filter(r => r.height <= sourceHeight)      // skip upscaling
        .map(r => ({
            label:  r.label,
            height: r.height,
            // Cloudinary URL anatomy:
            //   https://res.cloudinary.com/<cloud>/video/upload/<transformation>/<public_id>.<format>
            // Transformation: scale to target height, let width auto-preserve aspect ratio,
            // apply video codec h264 + audio codec aac for maximum browser compatibility.
            url: `https://res.cloudinary.com/${cloudName}/video/upload/` +
                 `c_scale,h_${r.height},w_auto,vc_h264,ac_aac/` +
                 `${publicId}.${format}`
        }));
};


export { uploadOnCloudinary, deleteFromCloudinary, generateQualityRenditions };