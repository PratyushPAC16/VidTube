import { useEffect, useState } from "react";
import { getWatchHistory } from "../api/user.api";
import VideoCard from "../components/common/VideoCard";
import Spinner from "../components/common/Spinner";
import { History, Trash2 } from "lucide-react";

function WatchHistory() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getWatchHistory();
        setVideos(res.data.data || []);
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
          <History size={32} className="text-blue-600" />
          Watch History
        </h1>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-40 flex flex-col items-center gap-6 opacity-30">
          <History size={64} className="text-slate-300" />
          <p className="text-slate-900 font-black text-xl uppercase tracking-tighter italic">Nothing watched yet</p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Videos you watch will appear here</p>
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

export default WatchHistory;
