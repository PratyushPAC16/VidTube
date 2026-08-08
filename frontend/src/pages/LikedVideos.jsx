import { useEffect, useState } from "react";
import { getLikedVideos } from "../api/like.api";
import VideoCard from "../components/common/VideoCard";
import Spinner from "../components/common/Spinner";
import { ThumbsUp } from "lucide-react";

function LikedVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getLikedVideos();
        // Backend returns { likedVideoCount, likedVideos } inside data.data
        const liked = res.data.data?.likedVideos || [];
        setVideos(liked.map((item) => item.video).filter(Boolean));
      } catch {
        // silenced
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-100">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
          <ThumbsUp size={32} className="text-blue-600" />
          Liked Videos
        </h1>
        <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
          {videos.length} videos
        </span>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-40 flex flex-col items-center gap-6 opacity-30">
          <ThumbsUp size={64} className="text-slate-300" />
          <p className="text-slate-900 font-black text-xl uppercase tracking-tighter italic">No liked videos</p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Videos you like will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default LikedVideos;
