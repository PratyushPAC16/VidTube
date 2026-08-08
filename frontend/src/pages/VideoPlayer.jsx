import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchVideoById } from "../app/slices/videoSlice";
import { toggleVideoLike, toggleCommentLike } from "../api/like.api";
import { toggleSubscription } from "../api/subscription.api";
import { getVideoComments, addComment, updateComment, deleteComment } from "../api/comment.api";
import { deleteVideo } from "../api/video.api";
import { formatViews, formatTimeAgo } from "../utils/formatters";
import { ThumbsUp, Share2, ThumbsDown, MessageSquare, Edit2, Trash2, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, ListPlus, X, Check } from "lucide-react";
import { getUserPlaylists, addVideoToPlaylist, removeVideoFromPlaylist } from "../api/playlist.api";
import Spinner from "../components/common/Spinner";
import toast from "react-hot-toast";

function VideoPlayer() {
  const { videoId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentVideo, loading } = useSelector((state) => state.video);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // ── Custom video player state ──
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const playerRef = useRef(null);
  const controlsTimer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showPlayPulse, setShowPlayPulse] = useState(false);

  // ── Quality selector state ──
  // activeQuality: the currently-selected rendition object { label, height, url }
  // showQualityMenu: whether the floating quality-picker is open
  const [activeQuality, setActiveQuality] = useState(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const fetchedVideoRef = useRef(null);

  useEffect(() => {
    if (fetchedVideoRef.current !== videoId) {
      dispatch(fetchVideoById(videoId));
      loadComments();
      fetchedVideoRef.current = videoId;
    }
  }, [videoId, dispatch]);

  useEffect(() => {
    if (currentVideo) {
      setLiked(currentVideo.isLiked || false);
      setLikesCount(currentVideo.likesCount || 0);
      setSubscribed(currentVideo.owner?.isSubscribed || false);
      setDisliked(false);

      // ── Initialise quality selector ──
      // Pick 720p by default; fall back to the highest available rendition.
      const renditions = currentVideo.qualityRenditions || [];
      if (renditions.length > 0) {
        const preferred = renditions.find(r => r.label === "720p")
                       || renditions[renditions.length - 1];
        setActiveQuality(preferred);
      } else {
        setActiveQuality(null); // no renditions → use original videoFile URL
      }
    }
  }, [currentVideo]);

  /**
   * handleQualityChange
   * Switch the <video> src to the selected rendition without losing the user's
   * current playback position.  We capture currentTime before the src swap,
   * then restore it once the new source has loaded enough to seek.
   */
  const handleQualityChange = useCallback((rendition) => {
    const v = videoRef.current;
    if (!v) return;
    const savedTime = v.currentTime;
    const wasPaused = v.paused;
    setActiveQuality(rendition);
    setShowQualityMenu(false);
    v.src = rendition.url;
    v.load();
    const onCanPlay = () => {
      v.currentTime = savedTime;
      if (!wasPaused) v.play().catch(() => {});
      v.removeEventListener("canplay", onCanPlay);
    };
    v.addEventListener("canplay", onCanPlay);
  }, []);

  const loadComments = async () => {
    try {
      const res = await getVideoComments(videoId, { page: 1, limit: 20 });
      setComments(res.data.data.docs || []);
    } catch {
      // silenced error for dev
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) return toast.error("Please login to like");
    try {
      await toggleVideoLike(videoId);
      setLiked(!liked);
      setLikesCount(liked ? Math.max(0, likesCount - 1) : likesCount + 1);
      if (disliked) setDisliked(false);
    } catch {
      toast.error("Failed to toggle like");
    }
  };

  const handleDislike = () => {
    if (!isAuthenticated) return toast.error("Please login to dislike");
    setDisliked(!disliked);
    if (liked) {
      setLiked(false);
      setLikesCount(Math.max(0, likesCount - 1));
      toggleVideoLike(videoId).catch(() => {});
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: currentVideo?.title || "Check out this video",
      text: `Watch "${currentVideo?.title}" on VidTube`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard!");
        } catch {
          toast.error("Failed to share");
        }
      }
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) return toast.error("Please login to subscribe");
    if (!currentVideo) return;
    try {
      await toggleSubscription(currentVideo.owner._id);
      setSubscribed((prev) => !prev);
      toast.success(subscribed ? "Unsubscribed" : "Subscribed!");
    } catch {
      toast.error("Failed to toggle subscription");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error("Login to comment");
    if (!commentText.trim()) return;
    try {
      await addComment(videoId, { content: commentText });
      setCommentText("");
      loadComments();
      toast.success("Comment added!");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      await updateComment(commentId, { content: editCommentText });
      setEditingCommentId(null);
      setEditCommentText("");
      loadComments();
      toast.success("Comment updated!");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteComment(commentId);
      loadComments();
      toast.success("Comment deleted!");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!isAuthenticated) return toast.error("Please login to like");
    try {
      await toggleCommentLike(commentId);
      toast.success("Toggled like!");
    } catch {
      toast.error("Failed to like comment");
    }
  };

  const handleDeleteVideo = async () => {
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) return;
    try {
      await deleteVideo(videoId);
      toast.success("Video deleted!");
      navigate("/");
    } catch {
      toast.error("Failed to delete video");
    }
  };

  const loadPlaylistsForModal = useCallback(async () => {
    if (!isAuthenticated || !user?._id) return;
    setLoadingPlaylists(true);
    try {
      const res = await getUserPlaylists(user._id);
      setUserPlaylists(res.data.data || []);
    } catch {
      toast.error("Failed to load your collections");
    } finally {
      setLoadingPlaylists(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (showPlaylistModal) {
      loadPlaylistsForModal();
    }
  }, [showPlaylistModal, loadPlaylistsForModal]);

  const handleTogglePlaylist = async (playlist, isAdded) => {
    try {
      if (isAdded) {
        await removeVideoFromPlaylist(videoId, playlist._id);
        toast.success("Removed from " + playlist.name);
      } else {
        await addVideoToPlaylist(videoId, playlist._id);
        toast.success("Saved to " + playlist.name);
      }
      loadPlaylistsForModal();
    } catch {
      toast.error("Action failed");
    }
  };

  // ── Video control handlers ──
  const fmtTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    setVolume(val);
    v.muted = val === 0;
    setIsMuted(val === 0);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || isSeeking) return;
    setCurrentTime(v.currentTime);
    setDuration(v.duration);
    setProgress((v.currentTime / v.duration) * 100 || 0);
    // buffered
    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100 || 0);
    }
  }, [isSeeking]);

  const handleProgressClick = useCallback((e) => {
    const v = videoRef.current;
    const bar = progressRef.current;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pos * v.duration;
    setProgress(pos * 100);
  }, []);

  const handleProgressDrag = useCallback((e) => {
    if (!isSeeking) return;
    handleProgressClick(e);
  }, [isSeeking, handleProgressClick]);

  const startSeeking = useCallback((e) => {
    setIsSeeking(true);
    handleProgressClick(e);
  }, [handleProgressClick]);

  const stopSeeking = useCallback(() => {
    setIsSeeking(false);
  }, []);

  useEffect(() => {
    if (isSeeking) {
      window.addEventListener("mousemove", handleProgressDrag);
      window.addEventListener("mouseup", stopSeeking);
      return () => {
        window.removeEventListener("mousemove", handleProgressDrag);
        window.removeEventListener("mouseup", stopSeeking);
      };
    }
  }, [isSeeking, handleProgressDrag, stopSeeking]);

  const skip = useCallback((sec) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = playerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  const handleVideoClick = useCallback(() => {
    togglePlay();
    setShowPlayPulse(true);
    setTimeout(() => setShowPlayPulse(false), 400);
    showControlsTemporarily();
  }, [togglePlay, showControlsTemporarily]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      // Don't capture keys when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      switch (e.key) {
        case " ": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": e.preventDefault(); skip(10); break;
        case "ArrowLeft": e.preventDefault(); skip(-10); break;
        case "ArrowUp": e.preventDefault(); { const v = videoRef.current; if (v) { v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); } } break;
        case "ArrowDown": e.preventDefault(); { const v = videoRef.current; if (v) { v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); } } break;
        case "m": case "M": toggleMute(); break;
        case "f": case "F": toggleFullscreen(); break;
        default: break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, skip, toggleMute, toggleFullscreen]);

  if (loading || !currentVideo) return <Spinner />;

  const isOwner = user?._id === currentVideo.owner?._id;

  return (
    <div className="hs-player-page">
      {/* Scoped styles — supports light + dark mode via .dark class */}
      <style>{`
        .hs-player-page {
          min-height: 100vh;
          padding: 16px;
        }
        @media (min-width: 768px) { .hs-player-page { padding: 32px 40px; } }
        .hs-player-page * { box-sizing: border-box; }

        .hs-layout {
          max-width: 1360px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        @media (min-width: 1024px) {
          .hs-layout { flex-direction: row; }
        }

        /* ═══════════════════════════════════════════
           CUSTOM VIDEO PLAYER (always dark — overlays video)
           ═══════════════════════════════════════════ */
        .hs-video-wrapper {
          position: relative;
          aspect-ratio: 16/9;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04);
          cursor: pointer;
          user-select: none;
        }
        .dark .hs-video-wrapper {
          box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
        }
        .hs-video-wrapper video {
          width: 100%; height: 100%;
          object-fit: contain; display: block;
        }
        .hs-vp-gradient-top {
          position: absolute; top: 0; left: 0; right: 0; height: 90px;
          background: linear-gradient(rgba(0,0,0,0.5), transparent);
          pointer-events: none; z-index: 2;
          opacity: 1; transition: opacity 0.4s;
        }
        .hs-vp-gradient-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 180px;
          background: linear-gradient(transparent, rgba(0,0,0,0.75));
          pointer-events: none; z-index: 2;
          opacity: 1; transition: opacity 0.4s;
        }
        .hs-controls-hidden .hs-vp-gradient-top,
        .hs-controls-hidden .hs-vp-gradient-bottom { opacity: 0; }

        .hs-center-play {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 5; width: 68px; height: 68px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 2px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s, transform 0.25s;
        }
        .hs-center-play.visible { opacity: 1; pointer-events: auto; }
        .hs-center-play:hover {
          background: rgba(255,255,255,0.18);
          transform: translate(-50%, -50%) scale(1.08);
        }
        .hs-play-pulse {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 4; width: 60px; height: 60px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          animation: hs-pulse 0.4s ease-out forwards;
          pointer-events: none;
        }
        @keyframes hs-pulse {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        .hs-controls-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          z-index: 10; padding: 0 16px 12px;
          opacity: 1; transition: opacity 0.4s;
        }
        .hs-controls-hidden .hs-controls-bar { opacity: 0; pointer-events: none; }
        .hs-progress-track {
          width: 100%; height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
          cursor: pointer; position: relative;
          margin-bottom: 10px; transition: height 0.15s;
        }
        .hs-progress-track:hover { height: 7px; }
        .hs-progress-buffered {
          position: absolute; top: 0; left: 0; height: 100%;
          background: rgba(255,255,255,0.18);
          border-radius: 2px; pointer-events: none;
        }
        .hs-progress-filled {
          position: absolute; top: 0; left: 0; height: 100%;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          border-radius: 2px; pointer-events: none;
          position: relative;
        }
        .hs-progress-thumb {
          position: absolute; right: -7px; top: 50%;
          transform: translateY(-50%);
          width: 14px; height: 14px;
          border-radius: 50%; background: #fff;
          box-shadow: 0 0 6px rgba(59,130,246,0.5), 0 0 12px rgba(99,102,241,0.3);
          opacity: 0; transition: opacity 0.2s;
        }
        .hs-progress-track:hover .hs-progress-thumb { opacity: 1; }
        .hs-ctrl-row { display: flex; align-items: center; justify-content: space-between; }
        .hs-ctrl-left, .hs-ctrl-right { display: flex; align-items: center; gap: 4px; }
        .hs-ctrl-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.85);
          cursor: pointer; padding: 7px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: all 0.2s;
        }
        .hs-ctrl-btn:hover { color: #fff; background: rgba(255,255,255,0.08); transform: scale(1.08); }
        .hs-ctrl-time {
          color: rgba(255,255,255,0.6);
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.3px; font-variant-numeric: tabular-nums;
          margin-left: 6px;
        }
        .hs-volume-group { display: flex; align-items: center; position: relative; }
        .hs-volume-slider-wrap {
          width: 0; overflow: hidden;
          transition: width 0.25s ease;
          display: flex; align-items: center;
        }
        .hs-volume-group:hover .hs-volume-slider-wrap,
        .hs-volume-slider-wrap.show { width: 80px; }
        .hs-volume-slider {
          -webkit-appearance: none; appearance: none;
          width: 72px; height: 3px;
          background: rgba(255,255,255,0.15);
          border-radius: 2px; outline: none;
          cursor: pointer; margin: 0 4px;
        }
        .hs-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%; background: #fff;
          box-shadow: 0 0 4px rgba(0,0,0,0.3); cursor: pointer;
        }
        .hs-volume-slider::-moz-range-thumb {
          width: 12px; height: 12px;
          border-radius: 50%; border: none; background: #fff;
          box-shadow: 0 0 4px rgba(0,0,0,0.3); cursor: pointer;
        }

        /* Quality selector */
        .hs-quality-group { position: relative; }
        .hs-quality-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.9);
          padding: 4px 10px; border-radius: 6px;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.5px; cursor: pointer;
          transition: all 0.2s; font-family: inherit;
        }
        .hs-quality-btn:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.28);
          color: #fff;
        }
        .hs-quality-menu {
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          background: rgba(15,23,42,0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
          min-width: 90px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.45);
          z-index: 20;
        }
        .hs-quality-menu-header {
          padding: 7px 14px;
          font-size: 9px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 1.5px;
          color: rgba(255,255,255,0.35);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .hs-quality-option {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
          padding: 9px 14px;
          background: none; border: none;
          color: rgba(255,255,255,0.7);
          font-size: 12px; font-weight: 700;
          cursor: pointer; width: 100%;
          text-align: left; transition: background 0.15s, color 0.15s;
          font-family: inherit;
        }
        .hs-quality-option:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .hs-quality-option.active {
          color: #60a5fa;
          background: rgba(96,165,250,0.08);
        }
        .hs-quality-option-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          flex-shrink: 0;
        }


        /* ═══════════════════════════════════════════
           PAGE CONTENT — Light (default) + Dark overrides
           ═══════════════════════════════════════════ */

        /* Title */
        .hs-title {
          font-size: 22px; font-weight: 800;
          color: #0f172a; line-height: 1.35;
          letter-spacing: -0.4px; margin-top: 24px;
        }
        .dark .hs-title { color: #f1f5f9; }
        @media (min-width: 768px) { .hs-title { font-size: 26px; } }

        /* Info row */
        .hs-info-row {
          display: flex; flex-wrap: wrap; align-items: center;
          justify-content: space-between;
          margin-top: 18px; gap: 18px;
          padding-bottom: 22px;
          border-bottom: 1px solid #e2e8f0;
        }
        .dark .hs-info-row { border-bottom-color: #334155; }

        .hs-channel-group { display: flex; align-items: center; gap: 14px; }

        .hs-avatar {
          width: 46px; height: 46px;
          border-radius: 50%; object-fit: cover;
          border: 2px solid #e2e8f0;
          transition: border-color 0.25s;
        }
        .dark .hs-avatar { border-color: #334155; }
        .hs-avatar:hover { border-color: #3b82f6; }
        .dark .hs-avatar:hover { border-color: #60a5fa; }

        .hs-channel-name {
          color: #0f172a; font-weight: 700; font-size: 14px;
          text-decoration: none; transition: color 0.2s;
          display: block; line-height: 1.2;
        }
        .dark .hs-channel-name { color: #f1f5f9; }
        .hs-channel-name:hover { color: #3b82f6; }
        .dark .hs-channel-name:hover { color: #60a5fa; }

        .hs-subs-text {
          color: #94a3b8; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 1px; margin-top: 3px;
        }
        .dark .hs-subs-text { color: #64748b; }

        /* Subscribe button */
        .hs-subscribe-btn {
          margin-left: 14px; padding: 9px 22px; border-radius: 8px;
          border: none; font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.7px;
          cursor: pointer; transition: all 0.25s;
        }
        .hs-subscribe-btn.active { background: #f1f5f9; color: #64748b; }
        .hs-subscribe-btn.active:hover { background: #e2e8f0; color: #334155; }
        .dark .hs-subscribe-btn.active { background: #1e293b; color: #94a3b8; }
        .dark .hs-subscribe-btn.active:hover { background: #334155; color: #f1f5f9; }
        .hs-subscribe-btn.inactive {
          background: #3b82f6; color: #fff;
          box-shadow: 0 4px 14px rgba(59,130,246,0.25);
        }
        .hs-subscribe-btn.inactive:hover {
          background: #2563eb;
          box-shadow: 0 6px 20px rgba(59,130,246,0.35);
          transform: translateY(-1px);
        }

        /* Action pill bar */
        .hs-actions-pill {
          display: flex; align-items: center; gap: 4px;
          background: #f8fafc; padding: 5px;
          border-radius: 50px; border: 1px solid #e2e8f0;
        }
        .dark .hs-actions-pill {
          background: rgba(255,255,255,0.04);
          border-color: #334155;
        }

        .hs-action-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 18px; border-radius: 50px;
          background: none; border: none;
          color: #64748b; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.22s;
        }
        .dark .hs-action-btn { color: rgba(255,255,255,0.5); }
        .hs-action-btn:hover {
          color: #334155; background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .dark .hs-action-btn:hover {
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.06);
          box-shadow: none;
        }
        .hs-action-btn.liked { color: #3b82f6; background: rgba(59,130,246,0.08); }
        .dark .hs-action-btn.liked { color: #60a5fa; background: rgba(96,165,250,0.1); }
        .hs-action-btn.disliked { color: #ef4444; background: rgba(239,68,68,0.06); }

        .hs-divider { width: 1px; height: 22px; background: #e2e8f0; margin: 0 2px; }
        .dark .hs-divider { background: #334155; }

        .hs-delete-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 18px; border-radius: 50px;
          background: none; border: none;
          color: #94a3b8; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.22s;
        }
        .hs-delete-btn:hover { color: #ef4444; background: rgba(239,68,68,0.06); }

        /* Description box */
        .hs-desc-box {
          margin-top: 22px; padding: 18px 22px;
          background: #f8fafc; border-radius: 16px;
          border: 1px solid #e2e8f0; transition: background 0.2s;
        }
        .dark .hs-desc-box { background: #1e293b; border-color: #334155; }
        .hs-desc-box:hover { background: #f1f5f9; }
        .dark .hs-desc-box:hover { background: #283548; }

        .hs-desc-meta { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
        .hs-views-badge {
          background: rgba(59,130,246,0.08); color: #3b82f6;
          padding: 3px 10px; border-radius: 6px;
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dark .hs-views-badge { background: rgba(96,165,250,0.1); color: #60a5fa; }
        .hs-meta-sep { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }
        .dark .hs-meta-sep { background: #475569; }
        .hs-meta-time {
          color: #94a3b8; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dark .hs-meta-time { color: #64748b; }
        .hs-desc-text {
          color: #475569; font-size: 13px; line-height: 1.75;
          white-space: pre-wrap; font-weight: 500;
        }
        .dark .hs-desc-text { color: #94a3b8; }

        /* Comments */
        .hs-comments { margin-top: 36px; }
        .hs-comments-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .hs-comments-title {
          font-size: 20px; font-weight: 800;
          color: #0f172a; letter-spacing: -0.3px;
          display: flex; align-items: center; gap: 10px;
        }
        .dark .hs-comments-title { color: #f1f5f9; }
        .hs-comments-icon { color: #3b82f6; opacity: 0.5; }

        .hs-comment-form { display: flex; gap: 14px; margin-bottom: 28px; }
        .hs-comment-avatar {
          width: 44px; height: 44px;
          border-radius: 50%; object-fit: cover;
          flex-shrink: 0; border: 2px solid #e2e8f0;
        }
        .dark .hs-comment-avatar { border-color: #334155; }
        .hs-comment-form-body {
          flex: 1; display: flex; flex-direction: column;
          align-items: flex-end; gap: 10px;
        }
        .hs-comment-textarea {
          width: 100%; background: #f8fafc;
          border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 14px 18px; color: #1e293b;
          font-size: 13px; font-weight: 500;
          outline: none; resize: none;
          transition: all 0.2s; font-family: inherit;
        }
        .dark .hs-comment-textarea {
          background: #1e293b; border-color: #334155; color: #f1f5f9;
        }
        .hs-comment-textarea::placeholder { color: #94a3b8; }
        .dark .hs-comment-textarea::placeholder { color: #64748b; }
        .hs-comment-textarea:focus {
          border-color: #93c5fd; background: #fff;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
        }
        .dark .hs-comment-textarea:focus {
          border-color: #3b82f6; background: #283548;
        }
        .hs-comment-form-actions { display: flex; gap: 10px; }
        .hs-discard-btn {
          padding: 8px 20px; border-radius: 50px;
          background: none; border: none;
          color: #94a3b8; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: color 0.2s;
        }
        .hs-discard-btn:hover { color: #334155; }
        .dark .hs-discard-btn:hover { color: #f1f5f9; }
        .hs-post-btn {
          padding: 9px 24px; border-radius: 50px;
          background: #3b82f6; border: none; color: #fff;
          font-size: 12px; font-weight: 800; cursor: pointer;
          box-shadow: 0 4px 14px rgba(59,130,246,0.25);
          transition: all 0.25s;
        }
        .hs-post-btn:hover {
          background: #2563eb;
          box-shadow: 0 6px 20px rgba(59,130,246,0.35);
          transform: translateY(-1px);
        }

        /* Comment items */
        .hs-comment-item { display: flex; gap: 14px; }
        .hs-comment-item + .hs-comment-item { margin-top: 24px; }
        .hs-comment-item-avatar {
          width: 40px; height: 40px;
          border-radius: 50%; object-fit: cover;
          flex-shrink: 0; border: 1px solid #e2e8f0;
        }
        .dark .hs-comment-item-avatar { border-color: #334155; }
        .hs-comment-item-name {
          color: #0f172a; font-size: 13px; font-weight: 800;
          cursor: pointer; letter-spacing: -0.2px;
        }
        .dark .hs-comment-item-name { color: #f1f5f9; }
        .hs-comment-item-name:hover { color: #3b82f6; }
        .dark .hs-comment-item-name:hover { color: #60a5fa; }
        .hs-comment-item-time {
          color: #94a3b8; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px; margin-left: 10px;
        }
        .dark .hs-comment-item-time { color: #64748b; }
        .hs-comment-item-body {
          color: #475569; font-size: 13px; line-height: 1.65;
          font-weight: 500; margin-top: 5px;
        }
        .dark .hs-comment-item-body { color: #94a3b8; }
        .hs-comment-like-btn {
          background: none; border: none; color: #94a3b8;
          display: flex; align-items: center; gap: 6px;
          cursor: pointer; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px;
          transition: color 0.2s; margin-top: 8px; padding: 0;
        }
        .hs-comment-like-btn:hover { color: #3b82f6; }
        .dark .hs-comment-like-btn:hover { color: #60a5fa; }

        .hs-comment-owner-actions {
          display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;
        }
        .hs-comment-item:hover .hs-comment-owner-actions { opacity: 1; }
        .hs-comment-edit-btn,
        .hs-comment-delete-btn {
          background: none; border: none; padding: 5px;
          cursor: pointer; border-radius: 6px; transition: all 0.2s;
        }
        .hs-comment-edit-btn { color: #94a3b8; }
        .hs-comment-edit-btn:hover { color: #3b82f6; background: rgba(59,130,246,0.06); }
        .hs-comment-delete-btn { color: #94a3b8; }
        .hs-comment-delete-btn:hover { color: #ef4444; background: rgba(239,68,68,0.06); }

        /* Edit comment */
        .hs-edit-textarea {
          width: 100%; background: #f8fafc;
          border: 1px solid #e2e8f0; border-radius: 10px;
          padding: 10px 14px; color: #1e293b; font-size: 13px;
          resize: none; outline: none; font-family: inherit;
          transition: border-color 0.2s; margin-top: 8px;
        }
        .dark .hs-edit-textarea {
          background: #1e293b; border-color: #334155; color: #f1f5f9;
        }
        .hs-edit-textarea:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
        .dark .hs-edit-textarea:focus { border-color: #3b82f6; }
        .hs-edit-actions { display: flex; gap: 8px; margin-top: 8px; }
        .hs-edit-save {
          padding: 6px 16px; border-radius: 6px;
          border: none; background: #3b82f6;
          color: #fff; font-size: 11px; font-weight: 800; cursor: pointer;
        }
        .hs-edit-cancel {
          padding: 6px 16px; border-radius: 6px;
          border: 1px solid #e2e8f0; background: #fff;
          color: #64748b; font-size: 11px; font-weight: 800; cursor: pointer;
        }
        .dark .hs-edit-cancel {
          border-color: #334155; background: #1e293b; color: #94a3b8;
        }

        .hs-empty-comments {
          padding: 48px 0; text-align: center;
          background: #f8fafc; border-radius: 16px;
          border: 1px dashed #e2e8f0;
        }
        .dark .hs-empty-comments { background: #1e293b; border-color: #334155; }
        .hs-empty-text {
          color: #94a3b8; font-size: 12px; font-weight: 700;
          font-style: italic; text-transform: uppercase; letter-spacing: 1px;
        }

        /* Sidebar */
        .hs-sidebar { display: none; }
        @media (min-width: 1024px) {
          .hs-sidebar { display: block; width: 360px; flex-shrink: 0; }
        }
        .hs-sidebar-title {
          font-size: 11px; font-weight: 800; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 1.5px;
          padding: 0 8px; margin-bottom: 16px;
        }
        .dark .hs-sidebar-title { color: #64748b; }
        .hs-sidebar-placeholder {
          padding: 28px; background: #f8fafc;
          border-radius: 16px; border: 1px dashed #e2e8f0;
          text-align: center; margin-bottom: 18px;
        }
        .dark .hs-sidebar-placeholder { background: #1e293b; border-color: #334155; }
        .hs-sidebar-placeholder p {
          color: #94a3b8; font-size: 11px; padding: 40px 0;
          font-style: italic; font-weight: 500; letter-spacing: 0.3px;
        }
        .dark .hs-sidebar-placeholder p { color: #64748b; }
        .hs-skeleton-card {
          display: flex; gap: 14px; padding: 10px 8px;
          border-radius: 12px; transition: background 0.2s; opacity: 0.6;
        }
        .hs-skeleton-card:hover { background: #f8fafc; }
        .dark .hs-skeleton-card:hover { background: rgba(255,255,255,0.03); }
        .hs-skel-thumb {
          width: 120px; height: 72px; background: #e2e8f0;
          border-radius: 10px; flex-shrink: 0;
        }
        .dark .hs-skel-thumb { background: #334155; }
        .hs-skel-lines {
          flex: 1; display: flex; flex-direction: column;
          gap: 8px; padding: 4px 0;
        }
        .hs-skel-line { height: 10px; border-radius: 5px; background: #e2e8f0; }
        .dark .hs-skel-line { background: #334155; }
        .hs-skel-line.w1 { width: 100%; }
        .hs-skel-line.w2 { width: 66%; }
        .hs-skel-line.w3 { width: 45%; height: 8px; margin-top: 4px; background: #f1f5f9; }
        .dark .hs-skel-line.w3 { background: #1e293b; }
      `}</style>

      <div className="hs-layout">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ═══ Custom Video Player ═══ */}
          <div
            className={`hs-video-wrapper ${showControls ? '' : 'hs-controls-hidden'}`}
            ref={playerRef}
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => { if (isPlaying) { clearTimeout(controlsTimer.current); setShowControls(false); } }}
          >
            <video
              ref={videoRef}
              src={activeQuality?.url || currentVideo.videoFile}
              autoPlay
              playsInline
              onClick={handleVideoClick}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => { setIsPlaying(true); showControlsTemporarily(); }}
              onPause={() => { setIsPlaying(false); setShowControls(true); }}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            />

            {/* Gradient overlays */}
            <div className="hs-vp-gradient-top" />
            <div className="hs-vp-gradient-bottom" />

            {/* Center play button (when paused) */}
            <div
              className={`hs-center-play ${!isPlaying ? 'visible' : ''}`}
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            >
              <Play size={28} fill="#fff" color="#fff" style={{ marginLeft: 3 }} />
            </div>

            {/* Play/pause pulse animation */}
            {showPlayPulse && (
              <div className="hs-play-pulse">
                {isPlaying ? <Play size={22} color="#fff" fill="#fff" /> : <Pause size={22} color="#fff" />}
              </div>
            )}

            {/* ── Bottom Controls Bar ── */}
            <div className="hs-controls-bar" onClick={(e) => e.stopPropagation()}>
              {/* Progress bar */}
              <div
                className="hs-progress-track"
                ref={progressRef}
                onMouseDown={startSeeking}
              >
                <div className="hs-progress-buffered" style={{ width: `${buffered}%` }} />
                <div className="hs-progress-filled" style={{ width: `${progress}%` }}>
                  <div className="hs-progress-thumb" />
                </div>
              </div>

              {/* Controls row */}
              <div className="hs-ctrl-row">
                <div className="hs-ctrl-left">
                  <button className="hs-ctrl-btn" onClick={togglePlay}>
                    {isPlaying ? <Pause size={20} /> : <Play size={20} fill="#fff" />}
                  </button>
                  <button className="hs-ctrl-btn" onClick={() => skip(-10)} title="-10s">
                    <SkipBack size={18} />
                  </button>
                  <button className="hs-ctrl-btn" onClick={() => skip(10)} title="+10s">
                    <SkipForward size={18} />
                  </button>
                  <div className="hs-volume-group"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button className="hs-ctrl-btn" onClick={toggleMute}>
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div className={`hs-volume-slider-wrap ${showVolumeSlider ? 'show' : ''}`}>
                      <input
                        type="range"
                        className="hs-volume-slider"
                        min="0" max="1" step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                      />
                    </div>
                  </div>
                  <span className="hs-ctrl-time">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                </div>
                <div className="hs-ctrl-right">
                  {/* Quality selector — only shown when renditions are available */}
                  {currentVideo.qualityRenditions?.length > 0 && (
                    <div className="hs-quality-group">
                      <button
                        className="hs-quality-btn"
                        onClick={(e) => { e.stopPropagation(); setShowQualityMenu(m => !m); }}
                        title="Change quality"
                      >
                        {activeQuality?.label ?? "Auto"}
                      </button>
                      {showQualityMenu && (
                        <div className="hs-quality-menu">
                          <div className="hs-quality-menu-header">Quality</div>
                          {currentVideo.qualityRenditions.map(r => (
                            <button
                              key={r.label}
                              className={`hs-quality-option ${activeQuality?.label === r.label ? "active" : ""}`}
                              onClick={(e) => { e.stopPropagation(); handleQualityChange(r); }}
                            >
                              {r.label}
                              {activeQuality?.label === r.label && <span className="hs-quality-option-dot" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button className="hs-ctrl-btn" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Details ═══ */}
          <h1 className="hs-title">{currentVideo.title}</h1>

          <div className="hs-info-row">
            <div className="hs-channel-group">
              <Link to={`/channel/${currentVideo.owner?.username}`}>
                <img src={currentVideo.owner?.avatar} className="hs-avatar" alt="Avatar" />
              </Link>
              <div>
                <Link to={`/channel/${currentVideo.owner?.username}`} className="hs-channel-name">
                  {currentVideo.owner?.fullname || currentVideo.owner?.username}
                </Link>
                <p className="hs-subs-text">{currentVideo.owner?.subscribersCount || 0} subscribers</p>
              </div>
              {!isOwner && (
                <button
                  onClick={handleSubscribe}
                  className={`hs-subscribe-btn ${subscribed ? "active" : "inactive"}`}
                >
                  {subscribed ? "SUBSCRIBED" : "SUBSCRIBE"}
                </button>
              )}
            </div>

            <div className="hs-actions-pill">
              <button
                onClick={handleLike}
                className={`hs-action-btn ${liked ? "liked" : ""}`}
              >
                <ThumbsUp size={18} fill={liked ? "currentColor" : "none"} />
                {likesCount}
              </button>
              <div className="hs-divider" />
              <button
                onClick={handleDislike}
                className={`hs-action-btn ${disliked ? "disliked" : ""}`}
              >
                <ThumbsDown size={18} fill={disliked ? "currentColor" : "none"} />
              </button>
              <div className="hs-divider" />
              <button onClick={handleShare} className="hs-action-btn">
                <Share2 size={18} />
                Share
              </button>
              <div className="hs-divider" />
              <button onClick={() => {
                if (!isAuthenticated) return toast.error("Please login to save video");
                setShowPlaylistModal(true);
              }} className="hs-action-btn">
                <ListPlus size={18} />
                Save
              </button>
              {isOwner && (
                <>
                  <div className="hs-divider" />
                  <button onClick={handleDeleteVideo} className="hs-delete-btn">
                    <Trash2 size={18} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ═══ Description Box ═══ */}
          <div className="hs-desc-box">
            <div className="hs-desc-meta">
              <span className="hs-views-badge">{formatViews(currentVideo.views)} VIEWS</span>
              <span className="hs-meta-sep" />
              <span className="hs-meta-time">{formatTimeAgo(currentVideo.createdAt)}</span>
            </div>
            <p className="hs-desc-text">{currentVideo.description}</p>
          </div>

          {/* ═══ Comments ═══ */}
          <div className="hs-comments">
            <div className="hs-comments-header">
              <h2 className="hs-comments-title">
                <MessageSquare size={22} className="hs-comments-icon" />
                {comments.length} Comments
              </h2>
            </div>

            {isAuthenticated && (
              <form onSubmit={handleAddComment} className="hs-comment-form">
                <img src={user.avatar} className="hs-comment-avatar" alt="My Profile" />
                <div className="hs-comment-form-body">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts on this video..."
                    className="hs-comment-textarea"
                    rows={3}
                  />
                  <div className="hs-comment-form-actions">
                    <button type="button" onClick={() => setCommentText("")} className="hs-discard-btn">Discard</button>
                    <button type="submit" className="hs-post-btn">Post Comment</button>
                  </div>
                </div>
              </form>
            )}

            <div>
              {comments.map((comment) => (
                <div key={comment._id} className="hs-comment-item">
                  <img src={comment.owner?.avatar} className="hs-comment-item-avatar" alt="Avatar" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span className="hs-comment-item-name">@{comment.owner?.username}</span>
                        <span className="hs-comment-item-time">{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                      {user?._id === comment.owner?._id && (
                        <div className="hs-comment-owner-actions">
                          <button
                            className="hs-comment-edit-btn"
                            onClick={() => { setEditingCommentId(comment._id); setEditCommentText(comment.content); }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="hs-comment-delete-btn"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingCommentId === comment._id ? (
                      <div>
                        <textarea
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          className="hs-edit-textarea"
                          rows={2}
                        />
                        <div className="hs-edit-actions">
                          <button onClick={() => handleEditComment(comment._id)} className="hs-edit-save">Save</button>
                          <button onClick={() => setEditingCommentId(null)} className="hs-edit-cancel">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="hs-comment-item-body">{comment.content}</p>
                    )}

                    <button
                      onClick={() => handleCommentLike(comment._id)}
                      className="hs-comment-like-btn"
                    >
                      <ThumbsUp size={14} /> Like
                    </button>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="hs-empty-comments">
                  <p className="hs-empty-text">No comments yet. Start the conversation!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Suggested Videos Sidebar ═══ */}
        <div className="hs-sidebar">
          <h3 className="hs-sidebar-title">Up Next</h3>
          <div className="hs-sidebar-placeholder">
            <p>Recommendation engine is tuning your feed...</p>
          </div>
          <div className="hs-skeleton-card">
            <div className="hs-skel-thumb" />
            <div className="hs-skel-lines">
              <div className="hs-skel-line w1" />
              <div className="hs-skel-line w2" />
              <div className="hs-skel-line w3" />
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-900">Save video to...</h3>
              <button onClick={() => setShowPlaylistModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            {loadingPlaylists ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : userPlaylists.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {userPlaylists.map(pl => {
                  const isAdded = pl.videos?.some(v => v._id === videoId || v === videoId);
                  return (
                    <button
                      key={pl._id}
                      onClick={() => handleTogglePlaylist(pl, isAdded)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isAdded ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                          {isAdded && <Check size={14} strokeWidth={3} />}
                        </div>
                        <span className="font-semibold text-slate-700 group-hover:text-slate-900 line-clamp-1">{pl.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 opacity-50 space-y-2">
                <ListPlus size={32} className="mx-auto text-slate-400" />
                <p className="italic text-slate-500 font-medium text-sm">You don't have any collections yet.</p>
              </div>
            )}
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
               <Link to="/playlists" onClick={() => setShowPlaylistModal(false)} className="text-blue-600 hover:text-blue-700 font-bold text-sm tracking-wide uppercase transition-colors flex justify-center py-2 hover:bg-blue-50 rounded-xl">Create new collection</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
