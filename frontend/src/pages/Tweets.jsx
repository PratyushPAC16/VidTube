import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getUserTweets, getSubscriptionFeed, createTweet, updateTweet, deleteTweet } from "../api/tweet.api";
import { toggleTweetLike } from "../api/like.api";
import { formatTimeAgo } from "../utils/formatters";
import { MessageCircle, Send, Edit2, Trash2, ThumbsUp, Rss } from "lucide-react";
import Spinner from "../components/common/Spinner";
import toast from "react-hot-toast";

// ── Reusable tweet card ──────────────────────────────────────────────────────
function TweetCard({ tweet, currentUser, onEdit, onDelete, onLike }) {
  const isOwner = tweet.owner?._id === currentUser?._id;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-lg hover:shadow-blue-900/5 transition-all group">
      <div className="flex gap-4">
        {/* Avatar */}
        <Link to={`/channel/${tweet.owner?.username}`} className="flex-shrink-0">
          {tweet.owner?.avatar ? (
            <img
              src={tweet.owner.avatar}
              className="w-11 h-11 rounded-full object-cover border border-slate-100 shadow-sm"
              alt={tweet.owner.fullname}
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black uppercase">
                {tweet.owner?.fullname?.[0] || tweet.owner?.username?.[0] || "?"}
              </span>
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={`/channel/${tweet.owner?.username}`}
                className="text-slate-900 text-sm font-black hover:text-blue-600 transition-colors"
              >
                @{tweet.owner?.username}
              </Link>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {formatTimeAgo(tweet.createdAt)}
              </span>
            </div>

            {isOwner && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(tweet)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onDelete(tweet._id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <p className="text-slate-700 text-sm leading-relaxed mt-2 font-medium">{tweet.content}</p>

          <div className="flex items-center gap-5 mt-4">
            <button
              onClick={() => onLike(tweet._id)}
              className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <ThumbsUp size={14} /> Like
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function Tweets() {
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("feed"); // "feed" | "mine"
  const [myTweets, setMyTweets] = useState([]);
  const [feedTweets, setFeedTweets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const loadMyTweets = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await getUserTweets(user._id);
      setMyTweets(res.data.data || []);
    } catch {
      // silenced
    }
  }, [user]);

  const loadFeed = useCallback(async () => {
    try {
      const res = await getSubscriptionFeed();
      setFeedTweets(res.data.data || []);
    } catch {
      // silenced
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    Promise.all([loadMyTweets(), loadFeed()]).finally(() => setLoading(false));
  }, [user, loadMyTweets, loadFeed]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await createTweet(content);
      setContent("");
      loadMyTweets();
      toast.success("Tweet posted!");
      setActiveTab("mine"); // Show the user their own tab after posting
    } catch {
      toast.error("Failed to post tweet");
    }
  };

  const handleStartEdit = (tweet) => {
    setEditingId(tweet._id);
    setEditContent(tweet.content);
  };

  const handleUpdate = async (tweetId) => {
    if (!editContent.trim()) return;
    try {
      await updateTweet(tweetId, editContent);
      setEditingId(null);
      setEditContent("");
      loadMyTweets();
      toast.success("Tweet updated!");
    } catch {
      toast.error("Failed to update tweet");
    }
  };

  const handleDelete = async (tweetId) => {
    if (!confirm("Delete this tweet?")) return;
    try {
      await deleteTweet(tweetId);
      loadMyTweets();
      toast.success("Tweet deleted!");
    } catch {
      toast.error("Failed to delete tweet");
    }
  };

  const handleLike = async (tweetId) => {
    try {
      await toggleTweetLike(tweetId);
      toast.success("Toggled like!");
    } catch {
      toast.error("Failed to like tweet");
    }
  };

  const activeTweets = activeTab === "mine" ? myTweets : feedTweets;

  return (
    <div className="p-6 md:p-12 max-w-3xl mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
          <MessageCircle size={36} className="text-blue-600" />
          Community
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">
          Stay connected with your channels and share updates
        </p>
      </div>

      {/* Create Tweet */}
      <form onSubmit={handleCreate} className="mb-8 bg-slate-50 border border-slate-200 rounded-3xl p-5">
        <div className="flex gap-4">
          {user?.avatar ? (
            <img
              src={user.avatar}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
              alt="Avatar"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black uppercase">{user?.fullname?.[0] || "?"}</span>
            </div>
          )}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share something with your subscribers..."
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none"
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
              >
                <Send size={14} /> Post
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab("feed")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
            activeTab === "feed"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Rss size={15} />
          Subscriptions Feed
          {feedTweets.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === "feed" ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-500"}`}>
              {feedTweets.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
            activeTab === "mine"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <MessageCircle size={15} />
          My Posts
          {myTweets.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === "mine" ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-500"}`}>
              {myTweets.length}
            </span>
          )}
        </button>
      </div>

      {/* Tweet list */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {activeTweets.map((tweet) =>
            editingId === tweet._id ? (
              // Inline edit mode
              <div key={tweet._id} className="bg-white border border-blue-200 rounded-3xl p-6 shadow-sm">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    onClick={() => handleUpdate(tweet._id)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-black transition-all hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-slate-500 px-6 py-2 rounded-full text-xs font-black hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <TweetCard
                key={tweet._id}
                tweet={tweet}
                currentUser={user}
                onEdit={handleStartEdit}
                onDelete={handleDelete}
                onLike={handleLike}
              />
            )
          )}

          {activeTweets.length === 0 && (
            <div className="text-center py-20 opacity-30 border-2 border-dashed border-slate-100 rounded-3xl">
              {activeTab === "feed" ? (
                <>
                  <Rss size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-900 font-black uppercase tracking-tighter italic">No posts in your feed</p>
                  <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">
                    Subscribe to channels to see their posts here
                  </p>
                </>
              ) : (
                <>
                  <MessageCircle size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-900 font-black uppercase tracking-tighter italic">No posts yet</p>
                  <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">
                    Share something with your subscribers above
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Tweets;
