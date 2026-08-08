# VidTube Backend — Bug Fix Changelog

All fixes applied to `backend/src`. Each entry lists the bug, the affected file(s), what was wrong, and what was changed.

---

## Bug 1 — ObjectId vs. String: `.includes()` on ObjectId Arrays

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Category** | Correctness |
| **Files** | `src/controllers/playlist.controllers.js` |

### Problem
`playlist.videos` is an array of Mongoose `ObjectId` objects. `videoId` from `req.params` is a plain JavaScript string. `Array.prototype.includes()` uses strict equality (`===`), so `ObjectId("abc") === "abc"` is always `false`.

- `addVideoToPlaylist`: duplicate-check **never triggered** → any video could be added multiple times.
- `removeVideoFromPlaylist`: existence-check **always failed** → every valid remove request returned a spurious 404.

### Fix
Replaced `.includes(videoId)` with `.some(id => id.toString() === videoId)` in both places.

```diff
// addVideoToPlaylist
- if (playlist.videos.includes(videoId)) {
+ if (playlist.videos.some(id => id.toString() === videoId)) {

// removeVideoFromPlaylist
- if (!playlist.videos.includes(videoId)) {
+ if (!playlist.videos.some(id => id.toString() === videoId)) {
```

---

## Bug 2 — Operator Precedence in Error Handler Drops `statusCode`

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Category** | Error Handling |
| **Files** | `src/middlewares/error.middlewares.js` |

### Problem
Due to JavaScript operator precedence the ternary bound tighter than `||`, so this expression:
```js
const statusCode = error.statusCode || error instanceof mongoose.Error ? 400 : 500
```
was parsed as:
```js
const statusCode = (error.statusCode || error instanceof mongoose.Error) ? 400 : 500
```
Any non-ApiError with a real `statusCode` (e.g. 403, 422) had it silently discarded and replaced with `400`.

### Fix
```diff
- const statusCode = error.statusCode || error instanceof mongoose.Error ? 400 : 500
+ const statusCode = error.statusCode || (error instanceof mongoose.Error ? 400 : 500)
```

---

## Bug 3 — `verifyJWT` Shadows Node.js `__dirname` Global

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Category** | Code Quality / Maintainability |
| **Files** | `src/middlewares/auth.middlewares.js` |

### Problem
The second parameter was named `__dirname` instead of `res`, shadowing the built-in Node.js global inside the function.

### Fix
```diff
- export const verifyJWT = asyncHandler(async (req, __dirname, next) => {
+ export const verifyJWT = asyncHandler(async (req, _res, next) => {
```

---

## Bug 4 — `SameSite: "none"` Without `Secure: true` in Development

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Category** | Security / Auth |
| **Files** | `src/controllers/user.controllers.js` — `loginUser` |

### Problem
`SameSite=None` requires `Secure=true` per browser spec. In development `secure` was `false`, so browsers silently rejected the auth cookies — login appeared to succeed but the session was never established.

### Fix
```diff
- sameSite: "none",
+ sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
```

---

## Bug 5 — Dead `user.refreshToken` Assignment After Token Refresh

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Category** | Correctness / Maintainability |
| **Files** | `src/controllers/user.controllers.js` — `refreshAccessToken` |

### Problem
After calling `generateAccessAndRefreshToken(user._id)`, the code assigned `user.refreshToken = newRefreshToken`. This was dead code — the helper already persists the new token to the DB internally via `user.save()`.

### Fix
```diff
  const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);
- user.refreshToken = newRefreshToken;
```

---

## Bug 6 — `loginUser` Validates Only `email`, Not `username` or `password`

| | |
|---|---|
| **Severity** | 🟠 High |
| **Category** | Input Validation |
| **Files** | `src/controllers/user.controllers.js` — `loginUser` |

### Problem
- Username-only login was blocked because the guard rejected the request before the `$or` query ran.
- `password` was never checked — omitting it passed `undefined` to bcrypt, returning a misleading 403 instead of 400.

### Fix
```diff
- if (!email) {
-     throw new ApiError(400, "Email is required!");
- }
+ if (!password) {
+     throw new ApiError(400, "Password is required!");
+ }
+ if (!email && !username) {
+     throw new ApiError(400, "Email or username is required!");
+ }
```

---

## Bug 7 — `registerUser` `.some()` Guard Misses `undefined` Fields

| | |
|---|---|
| **Severity** | 🟠 High |
| **Category** | Input Validation |
| **Files** | `src/controllers/user.controllers.js` — `registerUser` |

### Problem
`field?.trim() === ""` returns `false` when `field` is `undefined` (key absent from body), because `undefined?.trim()` is `undefined`, not `""`. Missing fields bypassed the guard entirely and reached `User.create()`.

### Fix
```diff
- if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
+ if ([fullname, email, username, password].some((field) => !field?.trim())) {
```

---

## Bug 8 — `changeCurrentPassword` Has No Input Validation

| | |
|---|---|
| **Severity** | 🟠 High |
| **Category** | Input Validation |
| **Files** | `src/controllers/user.controllers.js` — `changeCurrentPassword` |

### Problem
`oldPassword` and `newPassword` were used immediately without any presence check. Omitting either field passed `undefined` to `bcrypt.compare()`, which throws — resulting in an unhandled 500 instead of a proper 400.

### Fix
```diff
  const { oldPassword, newPassword } = req.body;
+
+ if (!oldPassword || !newPassword) {
+     throw new ApiError(400, "Old password and new password are required!");
+ }
+
  const user = await User.findById(req.user?._id);
```

---

## Bug 9 — File Upload: Path Traversal + Filename Collision via `file.originalname`

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **Category** | Security |
| **Files** | `src/middlewares/multer.middlewares.js` |

### Problem
`file.originalname` is fully attacker-controlled. Two vulnerabilities:
1. **Path traversal**: a filename like `../../src/app.js` resolves outside `public/temp` and can overwrite arbitrary source files.
2. **Filename collision**: two concurrent uploads with the same name silently overwrite each other in the temp directory.

### Fix
```diff
+ import path from "path";

  filename: function (req, file, cb) {
-   cb(null, file.originalname)
+   const ext = path.extname(file.originalname).toLowerCase();
+   const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
+   cb(null, uniqueName);
  }
```

---

## Bug 10 — `req.user._id` Not Cast to ObjectId in Aggregation `$in` Checks

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Category** | Correctness |
| **Files** | `src/controllers/user.controllers.js` — `getUserChannelProfile`; `src/controllers/video.controllers.js` — `getVideoById` (2 places) |

### Problem
Three aggregation pipeline `$in` checks passed `req.user?._id` without explicit BSON casting. The safe and idiomatic pattern — used correctly elsewhere (e.g., `getWatchHistory`) — is to wrap with `new mongoose.Types.ObjectId(...)`.

### Fix
```diff
// getUserChannelProfile (user.controllers.js)
- if: { $in: [req.user?._id, "$subscribers.subscriber"] },
+ if: { $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers.subscriber"] },

// getVideoById — isSubscribed (video.controllers.js)
- if: { $in: [req.user?._id, "$subscribers.subscriber"] },
+ if: { $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers.subscriber"] },

// getVideoById — isLiked (video.controllers.js)
- if: { $in: [req.user?._id, "$likes.likedBy"] },
+ if: { $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"] },
```

---

## Bug 11 — `fs.unlinkSync` in Cloudinary Catch Block Throws `ENOENT`

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **Category** | Robustness |
| **Files** | `src/utils/cloudinary.js` |

### Problem
If the Cloudinary upload fails and the local temp file was already removed, `fs.unlinkSync` throws `ENOENT`. This secondary exception replaces the original Cloudinary error and propagates as an unexpected 500.

### Fix
```diff
  } catch (error) {
-     fs.unlinkSync(localFilePath);
+     if (fs.existsSync(localFilePath)) {
+         fs.unlinkSync(localFilePath);
+     }
      return null;
  }
```

---

## Bug 12 — Unused `getRounds` Import from bcrypt

| | |
|---|---|
| **Severity** | 🟢 Low |
| **Category** | Code Quality |
| **Files** | `src/routes/user.routes.js` |

### Problem
`getRounds` was imported from `bcrypt` but never used anywhere in the file — dead import that adds noise.

### Fix
```diff
- import { getRounds } from "bcrypt";
```

---

## Summary

| # | Severity | File(s) Changed | Issue |
|---|----------|-----------------|-------|
| 1 | 🔴 Critical | `playlist.controllers.js` | `.includes()` on ObjectId array always false |
| 2 | 🔴 Critical | `error.middlewares.js` | Operator precedence drops real `statusCode` |
| 3 | 🟡 Medium | `auth.middlewares.js` | `__dirname` parameter shadows Node.js global |
| 4 | 🔴 Critical | `user.controllers.js` | `SameSite=None` + `Secure=false` breaks dev cookies |
| 5 | 🟡 Medium | `user.controllers.js` | Dead `user.refreshToken` assignment |
| 6 | 🟠 High | `user.controllers.js` | `loginUser` only validated `email` |
| 7 | 🟠 High | `user.controllers.js` | `registerUser` guard missed `undefined` fields |
| 8 | 🟠 High | `user.controllers.js` | `changeCurrentPassword` had no input validation |
| 9 | 🔴 Critical | `multer.middlewares.js` | Path traversal + collision via `file.originalname` |
| 10 | 🟡 Medium | `user.controllers.js`, `video.controllers.js` | `req.user._id` not cast to ObjectId in `$in` |
| 11 | 🟡 Medium | `cloudinary.js` | `fs.unlinkSync` throws ENOENT on missing temp file |
| 12 | 🟢 Low | `user.routes.js` | Unused `getRounds` import |

---

---

# Feature: Technical Metadata Pipeline + Stats Dashboard

Changes made to capture video technical metadata from Cloudinary and expose it through a new stats endpoint and a frontend dashboard page.

---

## Change F1 — Extended Video Schema with Technical Metadata Fields

| | |
|---|---|
| **Type** | Feature / Schema Extension |
| **File** | `src/models/video.models.js` |

### What Changed
Five new optional fields added to `videoSchema`, all sourced from Cloudinary's upload response object:

| Field | Type | Cloudinary Source | Description |
|---|---|---|---|
| `format` | `String` | `response.format` | Container format e.g. `"mp4"`, `"webm"` |
| `bitrate` | `Number` | `response.bit_rate` | Bits per second |
| `width` | `Number` | `response.width` | Frame width in pixels |
| `height` | `Number` | `response.height` | Frame height in pixels |
| `fileSize` | `Number` | `response.bytes` | Original file size in bytes |

`duration` already existed in the schema and is unchanged.

All fields are optional (no `required: true`) so existing documents without them remain valid — there is no breaking migration.

```diff
         duration: {
             type: Number,
             required: true
         },
+        // ── Technical metadata captured from Cloudinary upload response ──
+        format: {
+            type: String  // container format, e.g. "mp4", "webm" (Cloudinary: response.format)
+        },
+        bitrate: {
+            type: Number  // bits per second (Cloudinary: response.bit_rate)
+        },
+        width: {
+            type: Number  // frame width in pixels (Cloudinary: response.width)
+        },
+        height: {
+            type: Number  // frame height in pixels (Cloudinary: response.height)
+        },
+        fileSize: {
+            type: Number  // original file size in bytes (Cloudinary: response.bytes)
+        },
```

---

## Change F2 — `publishAVideo`: Persist Metadata from Cloudinary Response

| | |
|---|---|
| **Type** | Feature |
| **File** | `src/controllers/video.controllers.js` — `publishAVideo` |

### What Changed
The `Video.create({...})` call now reads the five new fields directly from the Cloudinary upload response object (`videoFile`), which is already in scope.

```diff
         duration: videoFile.duration,
+        // ── New: technical metadata from Cloudinary upload response ──
+        format:   videoFile.format,         // container format ("mp4", "webm", ...)
+        bitrate:  videoFile.bit_rate,       // bits per second
+        width:    videoFile.width,          // frame width in pixels
+        height:   videoFile.height,         // frame height in pixels
+        fileSize: videoFile.bytes,          // original file size in bytes
         owner: req.user._id,
```

**Assumption:** Cloudinary's `bit_rate`, `width`, `height`, and `bytes` fields are present in the response for all video uploads using `resource_type: "auto"`. They may be `undefined` for unsupported containers — hence the schema fields are not `required`.

---

## Change F3 — New `getVideoStats` Controller

| | |
|---|---|
| **Type** | Feature |
| **File** | `src/controllers/video.controllers.js` — new export `getVideoStats` |

### What Changed
A new async controller function was added. It runs a single `$facet` aggregation over the `videos` collection and returns:

| Response key | Description |
|---|---|
| `totalVideos` | Total documents in the collection |
| `uploadSuccessCount` | Same as `totalVideos` (see assumption) |
| `uploadFailureCount` | `null` — not trackable without an audit log |
| `publishedCount` | Videos with `isPublished: true` |
| `unpublishedCount` | Videos with `isPublished: false` |
| `averageFileSizeBytes` | Mean of `fileSize` across all videos |
| `averageDurationSecs` | Mean of `duration` across all videos |
| `averageBitrateBps` | Mean of `bitrate` across all videos |
| `recentUploads` | Array of the 20 most recently created videos with full metadata |

**Assumption flagged in-code and in the dashboard UI:**
Upload failures roll back both Cloudinary uploads and the `Video.create()` call, so they are never persisted. `uploadFailureCount` is returned as `null` with a comment explaining that a separate audit-log collection would be needed to track them.

Follows the existing `asyncHandler` + `ApiResponse` + `ApiError` conventions. Does not introduce any new dependencies.

---

## Change F4 — New `/stats` Route in `video.routes.js`

| | |
|---|---|
| **Type** | Feature |
| **File** | `src/routes/video.routes.js` |

### What Changed
- Imported `getVideoStats` from the controller.
- Registered `GET /api/v1/videos/stats`.
- **Placement:** The `/stats` route is registered **before** `/:videoId` intentionally. Express matches routes in order, so placing a literal path after a param route would cause Express to treat the string `"stats"` as a `videoId` value.

```diff
+router.route("/stats")
+    .get(getVideoStats); // GET /videos/stats — platform dashboard metrics
+
 router.route("/:videoId")
     .get(getVideoById)
```

The route inherits `router.use(verifyJWT)` at the top of the file, so authentication is required.

**Endpoint:** `GET /api/v1/videos/stats`

---

## Change F5 — New Frontend Dashboard Page

| | |
|---|---|
| **Type** | Feature |
| **File** | `backend/public/dashboard.html` |

### What Changed
A self-contained HTML page served by Express's existing `express.static("public")` middleware. No build step required.

**Access:** `http://localhost:<PORT>/dashboard.html`

**Features:**
- 8 stat cards: total videos, upload successes, upload failures (N/A with explanation), published/unpublished counts, average file size, average duration, average bitrate.
- Recent uploads table with columns: Title, Format, Resolution (W×H), Duration, File Size, Bitrate, Views, Publish Status, Upload Date, Owner.
- Inline assumption banner explaining why upload failure count is not available.
- Refresh button to re-fetch without a page reload.
- Fully responsive; dark theme matching VidTube aesthetic.
- Uses `credentials: 'include'` on the fetch so the existing JWT cookie is sent automatically.

**No new npm dependencies added.**

---

## Feature Change Summary

| # | Type | File(s) | Description |
|---|------|---------|-------------|
| F1 | Schema | `video.models.js` | Added 5 technical metadata fields |
| F2 | Controller | `video.controllers.js` — `publishAVideo` | Persist metadata from Cloudinary response |
| F3 | Controller | `video.controllers.js` — new `getVideoStats` | `$facet` aggregation stats endpoint |
| F4 | Route | `video.routes.js` | `GET /api/v1/videos/stats` (before `/:videoId`) |

| F5 | Frontend | `public/dashboard.html` | Dark-theme stats dashboard, no build step |

---

## Feature 6 — Cloudinary On-the-Fly Quality Renditions + Frontend Quality Picker

| | |
|---|---|
| **Type** | Feature |
| **Category** | Video Quality / UX |
| **Files** | `backend/src/utils/cloudinary.js`, `backend/src/models/video.models.js`, `backend/src/controllers/video.controllers.js`, `frontend/src/pages/VideoPlayer.jsx` |

### What Was Added

After a video is uploaded to Cloudinary, the backend now derives 2–3 quality rendition URLs (480p, 720p, 1080p) using Cloudinary's **URL-based on-the-fly transformation** feature and persists them on the `Video` document. The frontend VideoPlayer exposes a quality-picker button in the controls bar so users can switch quality levels without reloading the page.

---

### Backend Changes

#### `backend/src/utils/cloudinary.js` — new `generateQualityRenditions`

```diff
+ /**
+  * Derives on-the-fly Cloudinary transformation URLs for 480p / 720p / 1080p.
+  * No extra uploads or API calls — Cloudinary transcodes on first CDN request.
+  * Renditions whose target height > source height are skipped (no upscaling).
+  */
+ const generateQualityRenditions = (publicId, format = "mp4", sourceHeight = Infinity) => {
+     const RENDITIONS = [
+         { label: "480p",  height: 480  },
+         { label: "720p",  height: 720  },
+         { label: "1080p", height: 1080 }
+     ];
+     const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
+     return RENDITIONS
+         .filter(r => r.height <= sourceHeight)
+         .map(r => ({
+             label: r.label, height: r.height,
+             url: `https://res.cloudinary.com/${cloudName}/video/upload/` +
+                  `c_scale,h_${r.height},w_auto,vc_h264,ac_aac/${publicId}.${format}`
+         }));
+ };
+
- export { uploadOnCloudinary, deleteFromCloudinary };
+ export { uploadOnCloudinary, deleteFromCloudinary, generateQualityRenditions };
```

**Cloudinary URL anatomy:**
```
https://res.cloudinary.com/<cloud>/video/upload/c_scale,h_720,w_auto,vc_h264,ac_aac/<public_id>.mp4
```
- `c_scale,h_720,w_auto` — scale to 720 px height, preserve aspect ratio
- `vc_h264,ac_aac` — force H.264 + AAC for maximum browser compatibility
- Cloudinary transcodes lazily on first request, then caches in its CDN globally

#### `backend/src/models/video.models.js` — new schema field

```diff
+        // ── Quality renditions (on-the-fly Cloudinary transformation URLs) ──
+        qualityRenditions: [
+            {
+                label:  { type: String }, // "480p" | "720p" | "1080p"
+                height: { type: Number }, // target height in pixels
+                url:    { type: String }  // CDN URL with transformation params
+            }
+        ],
```

No `required` constraint — older documents without this field return an empty array and the player falls back to the original `videoFile` URL automatically.

#### `backend/src/controllers/video.controllers.js` — `publishAVideo`

```diff
+ import { uploadOnCloudinary, deleteFromCloudinary, generateQualityRenditions } from "../utils/cloudinary.js";
  ...
  // After successful video upload, before Video.create:
+ const qualityRenditions = generateQualityRenditions(
+     videoFile.public_id,
+     videoFile.format || "mp4",
+     videoFile.height         // prevents upscaling a 480p source to 720p/1080p
+ );
  const video = await Video.create({
      ...
+     qualityRenditions,
  });
```

Zero additional Cloudinary API calls — URL construction is pure string interpolation.

---

### Frontend Changes

#### `frontend/src/pages/VideoPlayer.jsx`

**State additions:**
```diff
+ const [activeQuality, setActiveQuality] = useState(null);
+ const [showQualityMenu, setShowQualityMenu] = useState(false);
```

**Default selection (720p preferred):**
```diff
+ const renditions = currentVideo.qualityRenditions || [];
+ if (renditions.length > 0) {
+   const preferred = renditions.find(r => r.label === "720p")
+                  || renditions[renditions.length - 1];
+   setActiveQuality(preferred);
+ }
```

**Quality change handler — preserves playback position:**
```diff
+ const handleQualityChange = useCallback((rendition) => {
+   const v = videoRef.current;
+   const savedTime = v.currentTime;
+   const wasPaused = v.paused;
+   setActiveQuality(rendition);
+   setShowQualityMenu(false);
+   v.src = rendition.url;
+   v.load();
+   v.addEventListener("canplay", function restore() {
+     v.currentTime = savedTime;
+     if (!wasPaused) v.play().catch(() => {});
+     v.removeEventListener("canplay", restore);
+   });
+ }, []);
```

**`<video>` src now uses active rendition:**
```diff
- src={currentVideo.videoFile}
+ src={activeQuality?.url || currentVideo.videoFile}
```

**Quality pill button + floating menu in the controls bar** (conditionally rendered only when `qualityRenditions.length > 0`):
- Glassmorphism floating menu (dark bg, backdrop-filter blur)
- Active rendition highlighted in blue with a dot indicator
- Menu closes automatically after selection

---

### Trade-offs vs. a "Real" HLS / Adaptive-Bitrate Pipeline

This approach trades production-grade ABR for zero infrastructure complexity. Here is a structured comparison:

| Dimension | This implementation (Cloudinary URL transforms) | True HLS / DASH (e.g. AWS MediaConvert + S3 + CloudFront) |
|---|---|---|
| **Setup complexity** | Zero — URLs are strings | High — encoding pipeline, manifest generation, CDN config |
| **First-play latency on a new rendition** | ~2–10 s extra on first CDN miss (Cloudinary lazy transcodes) | None — all renditions pre-generated at upload time |
| **Adaptive bitrate (ABR)** | ❌ Manual user pick only | ✅ Player auto-selects based on bandwidth |
| **Seek across the full duration** | Full seek on the selected MP4 (byte-range requests) | Segment-based — fast seek within any window |
| **Bandwidth efficiency** | Good per rendition; no mid-play adaptation | Excellent — switches renditions mid-stream seamlessly |
| **Player requirement** | Native `<video>` + `src` swap | HLS.js / video.js / Shaka Player required for HLS on non-Safari |
| **Parallel rendition count** | 3 (480p / 720p / 1080p) | Typically 5–7 (160p … 1080p + audio-only) |
| **Mid-stream quality switch** | Brief re-buffer (~1–3 s) on src swap | Seamless — segment boundary switch |
| **Cost** | Cloudinary transformation credits (free tier generous) | Encoding + storage + CDN egress (can be significant at scale) |
| **Offline / DRM support** | ❌ | ✅ with additional tooling |
| **Demability** | ✅ Works in a 5-minute demo session | ✅ But requires significant infrastructure pre-work |

**When to choose this approach:** Prototypes, small-scale platforms, or situations where a quick quality toggle is good enough and you don't want to manage a full transcoding pipeline.

**When to graduate to HLS:** When user drop-off due to buffering is measurable, when you have mobile users on variable connections, or when you're serving > ~10k concurrent viewers.

---

## Updated Feature Change Summary

| # | Type | File(s) | Description |
|---|------|---------|-------------|
| F1 | Schema | `video.models.js` | Added 5 technical metadata fields |
| F2 | Controller | `video.controllers.js` — `publishAVideo` | Persist metadata from Cloudinary response |
| F3 | Controller | `video.controllers.js` — new `getVideoStats` | `$facet` aggregation stats endpoint |
| F4 | Route | `video.routes.js` | `GET /api/v1/videos/stats` (before `/:videoId`) |
| F5 | Frontend | `public/dashboard.html` | Dark-theme stats dashboard, no build step |
| F6 | Util | `cloudinary.js` — new `generateQualityRenditions` | URL-only rendition generation (0 extra API calls) |
| F7 | Schema | `video.models.js` | Added `qualityRenditions` array field |
| F8 | Controller | `video.controllers.js` — `publishAVideo` | Persist renditions at upload time |
| F9 | Frontend | `VideoPlayer.jsx` | Quality-picker button + floating menu in controls bar |
