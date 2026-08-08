import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVideos } from "../app/slices/videoSlice";
import VideoCard from "../components/common/VideoCard";
import Spinner from "../components/common/Spinner";

function Home() {
  const dispatch = useDispatch();
  const { videos, loading } = useSelector((state) => state.video);

  useEffect(() => {
    dispatch(fetchVideos({ page: 1, limit: 20, sortBy: "createdAt", sortType: "desc" }));
  }, [dispatch]);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
        {videos.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
      {videos.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-40 opacity-20 filter grayscale">
           <p className="text-slate-900 font-black text-xl tracking-tighter uppercase italic">No activity found yet.</p>
           <p className="text-blue-600 text-xs mt-2 uppercase tracking-widest font-bold">Waiting for your first upload</p>
        </div>
      )}
    </div>
  );
}

export default Home;
