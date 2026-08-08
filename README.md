# 📺 VidTube

A full-stack YouTube-inspired video platform built with a **Node.js/Express REST API** backend and a **React + Vite** frontend. VidTube supports video uploads, streaming, channel management, playlists, tweets, subscriptions, likes, comments, and more.

---

## 📁 Project Structure

```
vidtube-project-main/
├── backend/        # Express.js REST API
└── frontend/       # React + Vite SPA
```

---

## ✨ Features

- 🔐 **Authentication** — Register, login, logout with JWT access & refresh tokens (stored in HTTP-only cookies)
- 🎬 **Videos** — Upload, stream, search, filter, paginate, publish/unpublish, and delete videos
- 📺 **Channels** — Public channel profiles with subscriber counts, video listings, and cover images
- 📝 **Playlists** — Create, update, delete playlists; add/remove videos
- 💬 **Comments** — Paginated comments on videos with full CRUD
- ❤️ **Likes** — Like/unlike videos, comments, and tweets
- 🔔 **Subscriptions** — Subscribe/unsubscribe to channels; view subscriber & subscription lists
- 🐦 **Tweets** — Post short-form text updates to your channel (Twitter/X-style)
- 📜 **Watch History** — Tracks videos watched per user
- 🖼️ **Avatar & Cover Image** — Upload and update profile images via Cloudinary
- 📊 **Dashboard** — Standalone HTML admin dashboard (`backend/public/dashboard.html`) with platform-wide video stats
- 🌙 **Dark Mode** — Toggle dark/light theme across the frontend

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | HTTP server & routing |
| MongoDB + Mongoose | Database & ODM |
| Cloudinary | Video & image cloud storage |
| Multer | File upload middleware |
| JWT | Access & refresh token auth |
| bcrypt | Password hashing |
| cookie-parser | HTTP-only cookie handling |
| cors | Cross-origin resource sharing |
| mongoose-aggregate-paginate-v2 | Cursor-based pagination |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite 8 | UI framework & dev server |
| React Router DOM v7 | Client-side routing |
| Redux Toolkit | Global state management |
| Axios | HTTP client |
| Tailwind CSS v4 | Utility-first styling |
| react-player | Video playback |
| react-hot-toast | Toast notifications |
| lucide-react | Icon library |
| timeago.js | Human-readable timestamps |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- [Cloudinary](https://cloudinary.com/) account for media storage

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/vidtube-project.git
cd vidtube-project-main
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file by copying the sample:

```bash
cp .env.sample .env
```

Fill in your values:

```env
PORT=8000
CORS_ORIGIN=http://localhost:5173

MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/vidtube

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

NODE_ENV=development
```

Start the development server:

```bash
npm run dev     # with nodemon (auto-reload)
# or
npm start       # without nodemon
```

The API will be available at `http://localhost:8000`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

> **Note:** Make sure `CORS_ORIGIN` in the backend `.env` matches the frontend origin (e.g., `http://localhost:5173`).

---

## 🗺️ Frontend Pages

| Route | Description | Auth Required |
|---|---|---|
| `/` | Home feed — browse all videos | ❌ |
| `/login` | Login page | ❌ |
| `/register` | Registration page | ❌ |
| `/search` | Search results | ❌ |
| `/video/:videoId` | Video player with comments & likes | ❌ |
| `/channel/:username` | Channel profile page | ❌ |
| `/upload` | Upload a new video | ✅ |
| `/playlists` | Manage your playlists | ✅ |
| `/playlist/:playlistId` | View a specific playlist | ✅ |
| `/history` | Watch history | ✅ |
| `/liked` | Liked videos | ✅ |
| `/tweets` | Your tweets feed | ✅ |
| `/subscriptions` | Channels you subscribe to | ✅ |
| `/settings` | Edit profile, avatar, cover image | ✅ |

---

## 🔌 API Reference

All endpoints are prefixed with `/api/v1`.

### Auth / Users — `/api/v1/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register with avatar & cover image |
| POST | `/login` | ❌ | Login; returns JWT cookies |
| POST | `/logout` | ✅ | Logout & clear cookies |
| POST | `/refresh-token` | ❌ | Rotate access token using refresh token |
| GET | `/current-user` | ✅ | Get the logged-in user's profile |
| GET | `/c/:username` | ✅ | Get a channel's public profile |
| PATCH | `/update-account` | ✅ | Update fullName and email |
| PATCH | `/change-password` | ✅ | Change password |
| PATCH | `/avatar` | ✅ | Update avatar image |
| PATCH | `/coverImage` | ✅ | Update cover image |
| GET | `/history` | ✅ | Get watch history |

### Videos — `/api/v1/videos`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | List videos (paginated, filterable, searchable) |
| POST | `/` | ✅ | Upload a new video |
| GET | `/stats` | ✅ | Platform-wide video statistics |
| GET | `/:videoId` | ✅ | Get a single video |
| PATCH | `/:videoId` | ✅ | Update title, description, thumbnail |
| DELETE | `/:videoId` | ✅ | Delete a video |
| PATCH | `/toggle/publish/:videoId` | ✅ | Toggle published/unpublished state |

### Comments — `/api/v1/comments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/:videoId` | ✅ | Get paginated comments for a video |
| POST | `/:videoId` | ✅ | Add a comment to a video |
| PATCH | `/c/:commentId` | ✅ | Update a comment |
| DELETE | `/c/:commentId` | ✅ | Delete a comment |

### Likes — `/api/v1/likes`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/toggle/v/:videoId` | ✅ | Toggle like on a video |
| POST | `/toggle/c/:commentId` | ✅ | Toggle like on a comment |
| POST | `/toggle/t/:tweetId` | ✅ | Toggle like on a tweet |
| GET | `/videos` | ✅ | Get all videos liked by the current user |

### Subscriptions — `/api/v1/subscriptions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/c/:channelId` | ✅ | Toggle subscription to a channel |
| GET | `/c/:channelId` | ✅ | Get subscribers of a channel |
| GET | `/u/:subscriberId` | ✅ | Get channels a user is subscribed to |

### Tweets — `/api/v1/tweets`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create a tweet |
| GET | `/user/:userId` | ✅ | Get all tweets by a user |
| PATCH | `/:tweetId` | ✅ | Update a tweet |
| DELETE | `/:tweetId` | ✅ | Delete a tweet |

### Playlists — `/api/v1/playlists`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create a playlist |
| GET | `/:playlistId` | ✅ | Get a playlist by ID |
| PATCH | `/:playlistId` | ✅ | Update playlist name/description |
| DELETE | `/:playlistId` | ✅ | Delete a playlist |
| PATCH | `/add/:videoId/:playlistId` | ✅ | Add a video to a playlist |
| PATCH | `/remove/:videoId/:playlistId` | ✅ | Remove a video from a playlist |
| GET | `/user/:userId` | ✅ | Get all playlists by a user |

### Healthcheck — `/api/v1/healthcheck`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Returns server health status |

---

## 🗄️ Data Models

```
User         — username, email, password (hashed), avatar, coverImage, watchHistory, refreshToken
Video        — videoFile (Cloudinary), thumbnail, title, description, duration, views, isPublished, owner
Comment      — content, video, owner
Like         — video | comment | tweet, likedBy
Subscription — subscriber, channel
Tweet        — content, owner
Playlist     — name, description, videos[], owner
```

---

## 🏗️ Architecture

```
frontend (React + Redux)
        ↕ HTTP/JSON (Axios)
backend (Express REST API)
        ↕
MongoDB (Mongoose ODM)   +   Cloudinary (Media Storage)
```

- **Authentication** uses a dual-token strategy: short-lived access tokens (1 day) sent in HTTP-only cookies, paired with long-lived refresh tokens (10 days) for seamless re-authentication.
- **File uploads** are handled by Multer (temporary disk storage) and then streamed to Cloudinary.
- **Pagination** uses MongoDB aggregation pipelines with `mongoose-aggregate-paginate-v2`.
- **Error handling** is centralized through a global Express error middleware (`errorHandler`).

---

## 📜 Scripts

### Backend
```bash
npm run dev     # Start with nodemon (development)
npm start       # Start without nodemon (production)
```

### Frontend
```bash
npm run dev     # Start Vite dev server
npm run build   # Build for production
npm run preview # Preview production build
npm run lint    # Run ESLint
```

---

## 🔒 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Backend server port (default: `8000`) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `MONGODB_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Secret for signing access JWTs |
| `ACCESS_TOKEN_EXPIRY` | Access token TTL (e.g. `1d`) |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh JWTs |
| `REFRESH_TOKEN_EXPIRY` | Refresh token TTL (e.g. `10d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NODE_ENV` | `development` or `production` |

---

## 🐛 Bug Fixes & Changelog

See [BUGFIXES.md](./BUGFIXES.md) for a detailed log of all bug fixes, patches, and resolved issues throughout development.

---

## 📄 License

ISC — see `backend/package.json` for details.
