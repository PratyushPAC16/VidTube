import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchVideos } from "../app/slices/videoSlice";
import VideoCard from "../components/common/VideoCard";
import Spinner from "../components/common/Spinner";
import { SlidersHorizontal, Search as SearchIcon } from "lucide-react";

function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const dispatch = useDispatch();
  const { videos, loading } = useSelector((state) => state.video);

  useEffect(() => {
    if (query) {
       dispatch(fetchVideos({ query, page: 1, limit: 20 }));
    }
  }, [query, dispatch]);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 border-b border-slate-100 pb-8 gap-6">
         <h2 className="text-3xl md:text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
            <SearchIcon size={32} className="text-blue-600 opacity-50" />
            Showing results for "<span className="text-blue-600 italic">{query}</span>"
         </h2>
         <button className="flex items-center gap-2 bg-slate-50 text-slate-600 hover:text-blue-600 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm transition-all hover:shadow-lg active:scale-95">
            <SlidersHorizontal size={16} /> Filter Results
         </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-40 flex flex-col items-center gap-6 opacity-40 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
           <div className="bg-white p-6 rounded-full shadow-2xl opacity-50"><SearchIcon size={64} className="text-slate-300" /></div>
           <div className="max-w-md">
              <p className="text-slate-900 font-black text-2xl uppercase tracking-tighter italic mb-2">No matching content found.</p>
              <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-widest">Double check your spelling or try broader terms like "tutorial" or "vlog".</p>
           </div>
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

export default SearchResults;
