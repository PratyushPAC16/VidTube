import { Link } from "react-router-dom";
import { formatDuration, formatViews, formatTimeAgo } from "../../utils/formatters";

function VideoCard({ video }) {
  return (
    <Link to={`/video/${video._id}`} className="group block">
      <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <span className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-xl">
          {formatDuration(video.duration)}
        </span>
      </div>
      <div className="flex gap-3 mt-3.5">
        <img
          src={video.owner?.avatar}
          alt={video.owner?.username}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-100 shadow-sm"
        />
        <div>
          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">{video.owner?.username}</p>
          <p className="text-[11px] text-slate-400 font-medium">
            {formatViews(video.views)} · {formatTimeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default VideoCard;
