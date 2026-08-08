import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getUserChannel } from "../api/user.api";
import { getAllVideos } from "../api/video.api";
import { getUserPlaylists } from "../api/playlist.api";
import { toggleSubscription } from "../api/subscription.api";
import { useSelector } from "react-redux";
import VideoCard from "../components/common/VideoCard";
import Spinner from "../components/common/Spinner";
import toast from "react-hot-toast";
import { ListVideo, Eye, ThumbsUp, Video, CalendarDays, Mail, MapPin } from "lucide-react";
import { formatViews, formatTimeAgo } from "../utils/formatters";

function Channel() {
  const { username } = useParams();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const channelRes = await getUserChannel(username);
        const ch = channelRes.data.data;
        setChannel(ch);
        setSubscribed(ch.isSubscribed);

        const chVideos = await getAllVideos({ userId: ch._id, page: 1, limit: 20 });
        setVideos(chVideos.data.data.docs);

        // Load playlists
        try {
          const playlistRes = await getUserPlaylists(ch._id);
          setPlaylists(playlistRes.data.data || []);
        } catch {
          // Playlists may fail if user has none
        }
      } catch {
        toast.error("Failed to load channel");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) return toast.error("Please login to subscribe");
    try {
      await toggleSubscription(channel._id);
      setSubscribed((prev) => !prev);
      toast.success(subscribed ? "Unsubscribed" : "Subscribed!");
    } catch {
      toast.error("Failed to toggle subscription");
    }
  };

  if (loading) return <Spinner />;
  if (!channel) return <div className="text-slate-900 p-20 text-center font-bold">Channel not found.</div>;

  const isOwner = user?._id === channel._id;

  // Compute insights data from videos
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalVideos = videos.length;

  const tabs = ["videos", "playlists", "insights", "about"];

  return (
    <div className="bg-white min-h-screen">
      {/* Cover Image */}
      <div className="h-44 md:h-72 bg-slate-50 border-b border-slate-100 overflow-hidden relative">
        {channel.coverImage ? (
          <img src={channel.coverImage} className="w-full h-full object-cover" alt="Cover"/>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50/50 via-slate-50 to-blue-50/20" />
        )}
      </div>

      {/* Channel Header */}
      <div className="px-6 md:px-10 py-10 flex flex-col md:flex-row md:items-center justify-between gap-8 max-w-7xl mx-auto mt-[-40px] md:mt-[-60px] relative z-10">
        <div className="flex items-start md:items-center gap-6 md:gap-10">
          <img
            src={channel.avatar}
            className="w-24 h-24 md:w-36 md:h-36 rounded-full object-cover border-4 border-white ring-4 ring-blue-600/10 shadow-2xl"
            alt="Avatar"
          />
          <div className="md:mt-8">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{channel.fullname}</h1>
            <p className="text-blue-600 font-black text-sm uppercase tracking-widest mt-1.5 opacity-70">@{channel.username}</p>
            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold uppercase tracking-tight mt-3">
              <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{channel.subscribersCount} subscribers</span>
              <span className="opacity-30">/</span>
              <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{channel.channelsSubscribedTo} subscriptions</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 md:mt-8">
          {!isOwner ? (
            <button
              onClick={handleSubscribe}
              className={`px-10 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-xl ${
                subscribed ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
              }`}
            >
              {subscribed ? "Subscribed" : "Subscribe Channel"}
            </button>
          ) : (
            <button
              onClick={() => navigate("/settings")}
              className="px-10 py-3 rounded-full font-black text-xs uppercase tracking-widest bg-slate-950 text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
            >
               Manage Profile
            </button>
          )}
        </div>
      </div>

      {/* Tab Nav */}
      <div className="px-6 md:px-10 border-b border-slate-100 flex gap-10 max-w-7xl mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-400 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ═══ Tab Content ═══ */}
      <div className="max-w-7xl mx-auto">

        {/* ── VIDEOS TAB ── */}
        {activeTab === "videos" && (
          <div className="p-6 md:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
            {videos.length === 0 && (
              <div className="col-span-full py-32 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center gap-4">
                <Video size={40} className="opacity-30" />
                <p className="italic font-bold tracking-widest text-xs uppercase opacity-50">This channel hasn't uploaded any content yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PLAYLISTS TAB ── */}
        {activeTab === "playlists" && (
          <div className="p-6 md:p-10">
            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {playlists.map((pl) => (
                  <Link
                    key={pl._id}
                    to={`/playlist/${pl._id}`}
                    className="group block rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:border-blue-100 transition-all overflow-hidden"
                  >
                    {/* Thumbnail stack */}
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      {pl.previewThumbnails && pl.previewThumbnails.length > 0 ? (
                        <img
                          src={pl.previewThumbnails[0].thumbnail}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={pl.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
                          <ListVideo size={40} className="text-slate-300" />
                        </div>
                      )}
                      {/* Video count badge */}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 backdrop-blur-sm">
                        <ListVideo size={12} />
                        {pl.videoCount || 0} videos
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                        {pl.name}
                      </h3>
                      {pl.description && (
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{pl.description}</p>
                      )}
                      <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider mt-2">
                        {formatTimeAgo(pl.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center gap-4">
                <ListVideo size={40} className="opacity-30" />
                <p className="italic font-bold tracking-widest text-xs uppercase opacity-50">No playlists created yet.</p>
                {isOwner && (
                  <Link
                    to="/playlists"
                    className="mt-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors"
                  >
                    Create a Playlist
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === "insights" && (
          <div className="p-6 md:p-10">
            {isOwner ? (
              <div className="space-y-8">
                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-100 p-2 rounded-lg"><Video size={18} className="text-blue-600" /></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Videos</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{totalVideos}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-green-100 p-2 rounded-lg"><Eye size={18} className="text-green-600" /></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Views</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{formatViews(totalViews)}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-purple-100 p-2 rounded-lg"><ThumbsUp size={18} className="text-purple-600" /></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscribers</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{channel.subscribersCount}</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-amber-100 p-2 rounded-lg"><ListVideo size={18} className="text-amber-600" /></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Playlists</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{playlists.length}</p>
                  </div>
                </div>

                {/* Top performing videos */}
                {videos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Top Performing Videos</h3>
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                      {[...videos]
                        .sort((a, b) => (b.views || 0) - (a.views || 0))
                        .slice(0, 5)
                        .map((v, idx) => (
                          <Link
                            key={v._id}
                            to={`/video/${v._id}`}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                          >
                            <span className="text-lg font-black text-slate-300 w-6 text-center">{idx + 1}</span>
                            <img src={v.thumbnail} className="w-20 h-12 rounded-lg object-cover flex-shrink-0" alt="" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{v.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{formatTimeAgo(v.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 flex-shrink-0">
                              <span className="flex items-center gap-1"><Eye size={13} /> {formatViews(v.views)}</span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-32 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center gap-4">
                <Eye size={40} className="opacity-30" />
                <p className="italic font-bold tracking-widest text-xs uppercase opacity-50">Channel insights are only visible to the channel owner.</p>
              </div>
            )}
          </div>
        )}

        {/* ── ABOUT TAB ── */}
        {activeTab === "about" && (
          <div className="p-6 md:p-10">
            <div className="max-w-2xl space-y-8">
              {/* Description */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Description</h3>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {channel.description || "This channel hasn't added a description yet."}
                </p>
              </div>

              {/* Details */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-slate-600">{channel.email || "No email provided"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarDays size={16} className="text-slate-400" />
                    <span className="text-slate-600">
                      Joined {new Date(channel.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="text-slate-600">{channel.location || "Location not specified"}</span>
                  </div>
                </div>
              </div>

              {/* Channel stats summary */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Stats</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-xl font-black text-slate-900">{totalVideos}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">videos</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-xl font-black text-slate-900">{formatViews(totalViews)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">views</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-xl font-black text-slate-900">{channel.subscribersCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">subscribers</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-xl font-black text-slate-900">{channel.channelsSubscribedTo}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">subscriptions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Channel;
