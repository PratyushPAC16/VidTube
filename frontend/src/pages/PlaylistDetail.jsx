import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPlaylistById, removeVideoFromPlaylist, addVideoToPlaylist } from "../api/playlist.api";
import { getAllVideos } from "../api/video.api";
import Spinner from "../components/common/Spinner";
import VideoCard from "../components/common/VideoCard";
import toast from "react-hot-toast";
import { ListVideo, Trash2, Play, Share2, Plus, X, Search } from "lucide-react";
import { useSelector } from "react-redux";

function PlaylistDetail() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableVideos, setAvailableVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadAvailableVideos = async () => {
    try {
      const res = await getAllVideos({ limit: 50, query: searchQuery });
      setAvailableVideos(res.data.data.docs || []);
    } catch {
      toast.error("Failed to load videos");
    }
  };

  useEffect(() => {
    if (showAddModal) {
      loadAvailableVideos();
    }
  }, [showAddModal, searchQuery]);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const res = await getPlaylistById(playlistId);
      setPlaylist(res.data.data);
    } catch {
      toast.error("Failed to load playlist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (videoId) => {
    try {
      await removeVideoFromPlaylist(videoId, playlistId);
      loadPlaylist();
      toast.success("Video removed from playlist");
    } catch {
      toast.error("Failed to remove video");
    }
  };

  const handleStartWatching = () => {
    if (playlist.videos?.length > 0) {
      navigate(`/video/${playlist.videos[0]._id}`);
    } else {
      toast.error("No videos in this playlist");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to share link");
    }
  };

  const handleAddVideo = async (videoId) => {
    setAddingVideo(true);
    try {
      await addVideoToPlaylist(videoId, playlistId);
      toast.success("Video added to playlist!");
      loadPlaylist();
      setShowAddModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add video");
    } finally {
      setAddingVideo(false);
    }
  };

  if (loading) return <Spinner />;
  if (!playlist) return <div className="text-slate-900 p-20 text-center font-bold font-black text-2xl tracking-tighter uppercase italic">Collection not found.</div>;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 bg-white min-h-screen">
      {/* Sidebar Info */}
      <div className="w-full lg:w-[400px] bg-gradient-to-br from-blue-50 to-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl h-fit sticky top-24">
         <div className="aspect-video bg-slate-200 rounded-3xl overflow-hidden mb-8 shadow-2xl relative group border-4 border-white shadow-blue-900/10">
            {playlist.videos?.[0] ? (
               <img src={playlist.videos[0].thumbnail} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" alt="Preview"/>
            ) : (
               <div className="flex items-center justify-center h-full"><ListVideo size={64} className="text-slate-300 opacity-50" /></div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-white/40 backdrop-blur-md p-5 text-center flex flex-col items-center gap-3">
               <button 
                 onClick={handleStartWatching}
                 className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
               >
                  <Play size={14} fill="white" /> Start Watching
               </button>
            </div>
         </div>
         <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter mb-4">{playlist.name}</h1>
         <p className="text-slate-500 text-sm leading-relaxed font-medium mb-10 italic">{playlist.description}</p>
         
         <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100">
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CURATOR</span>
               <span className="text-slate-900 text-xs font-bold uppercase tracking-tight">@{playlist.owner?.username}</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CONTENT</span>
               <span className="text-blue-600 text-xs font-black uppercase tracking-tight">{playlist.videos?.length || 0} ITEMS</span>
            </div>
         </div>
         <div className="flex gap-4 mt-10">
            <button onClick={handleShare} className="flex-1 bg-white hover:bg-slate-50 text-slate-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100 flex items-center justify-center gap-3 shadow-sm active:scale-95">
               <Share2 size={16} /> Share Link
            </button>
            {user?._id === playlist.owner?._id && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all  flex items-center justify-center gap-3 shadow-sm active:scale-95"
              >
                 <Plus size={16} /> Add Video
              </button>
            )}
         </div>
      </div>

      {/* Videos List */}
      <div className="flex-1 space-y-6">
         {playlist.videos?.map((video, idx) => (
            <div key={video._id} className="flex gap-6 group bg-white p-5 rounded-[2rem] hover:bg-slate-50 border border-slate-100/50 hover:border-slate-100 transition-all shadow-sm">
               <div className="relative flex items-center pr-2 opacity-20 group-hover:opacity-100 transition-opacity">
                  <span className="text-xl font-black text-slate-300 italic">#{idx + 1}</span>
               </div>
               <div className="w-56 aspect-video flex-shrink-0 relative rounded-2xl overflow-hidden shadow-lg shadow-blue-900/5 border border-slate-100 group-hover:scale-[1.02] transition-transform">
                  <Link to={`/video/${video._id}`}>
                    <img src={video.thumbnail} className="w-full h-full object-cover" alt="Thumbnail"/>
                  </Link>
               </div>
               <div className="flex-1 flex flex-col justify-center min-w-0">
                  <Link to={`/video/${video._id}`} className="text-slate-900 font-black leading-snug line-clamp-2 hover:text-blue-600 transition-colors uppercase tracking-tighter text-base">
                     {video.title}
                  </Link>
                  <p className="text-blue-600 text-xs mt-2.5 font-black uppercase tracking-widest opacity-70">@{video.owner?.username}</p>
               </div>
               {user?._id === playlist.owner?._id && (
                 <button 
                   onClick={() => handleRemove(video._id)}
                   className="p-3 text-slate-400 hover:text-red-600 transition-all opacity-20 group-hover:opacity-100 hover:bg-white rounded-xl shadow-sm"
                 >
                   <Trash2 size={20} />
                 </button>
               )}
            </div>
         ))}
         {(!playlist.videos || playlist.videos.length === 0) && (
            <div className="py-32 text-center opacity-30 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 flex flex-col items-center gap-6">
               <div className="bg-white p-4 rounded-full shadow-2xl opacity-20"><ListVideo size={48} className="text-slate-900" /></div>
               <p className="italic text-slate-500 uppercase tracking-widest font-black text-sm">Collection is currently void.</p>
            </div>
         )}
      </div>

      {/* Add Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center p-6 z-50 items-center">
           <div className="bg-white rounded-3xl p-8 max-w-2xl w-full border border-slate-100 shadow-2xl flex flex-col max-h-[80vh]">
             <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
               <h3 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3"><Plus size={24} className="text-blue-600"/> Add Video to Collection</h3>
               <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-all"><X size={20}/></button>
             </div>
             
             <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100 focus:border-blue-400 transition-all"
                />
             </div>

             <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
                {availableVideos.length > 0 ? availableVideos.map(video => {
                   const isAlreadyAdded = playlist.videos?.some(pv => pv._id === video._id);
                   return (
                     <div key={video._id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all items-center">
                        <img src={video.thumbnail} className="w-24 aspect-video object-cover rounded-xl" alt="thumb"/>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-slate-900 line-clamp-1">{video.title}</h4>
                           <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">@{video.owner?.username}</p>
                        </div>
                        <button 
                          disabled={isAlreadyAdded || addingVideo}
                          onClick={() => handleAddVideo(video._id)}
                          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isAlreadyAdded ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95'}`}
                        >
                           {isAlreadyAdded ? 'Added' : 'Add'}
                        </button>
                     </div>
                   );
                }) : (
                   <div className="text-center py-10 opacity-50"><p className="italic text-slate-500 uppercase tracking-widest font-black text-sm">No videos found.</p></div>
                )}
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default PlaylistDetail;
