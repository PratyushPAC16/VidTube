import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getSubscribedChannels } from "../api/subscription.api";
import Spinner from "../components/common/Spinner";
import { Users, Bell } from "lucide-react";

function Subscriptions() {
  const { user } = useSelector((state) => state.auth);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    const load = async () => {
      try {
        const res = await getSubscribedChannels(user._id);
        // Backend returns { subscribedChannelCount, subscribedChannels }
        const list = res.data.data?.subscribedChannels || [];
        setChannels(list);
      } catch {
        // silenced
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-100">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
          <Bell size={32} className="text-blue-600" />
          Subscriptions
        </h1>
        <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
          {channels.length} channels
        </span>
      </div>

      {/* Empty state */}
      {channels.length === 0 ? (
        <div className="text-center py-40 flex flex-col items-center gap-6 opacity-30">
          <Users size={64} className="text-slate-300" />
          <p className="text-slate-900 font-black text-xl uppercase tracking-tighter italic">
            No subscriptions yet
          </p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Channels you subscribe to will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {channels.map(({ channel }) => {
            if (!channel) return null;
            return (
              <Link
                key={channel._id}
                to={`/channel/${channel.username}`}
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300 bg-white active:scale-95"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-slate-100 group-hover:ring-blue-300 transition-all duration-300">
                    {channel.avatar ? (
                      <img
                        src={channel.avatar}
                        alt={channel.fullname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-2xl font-black uppercase">
                          {channel.fullname?.[0] || channel.username?.[0] || "?"}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Bell badge */}
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 shadow-md">
                    <Bell size={10} className="text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="text-center">
                  <p className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate max-w-[140px]">
                    {channel.fullname || channel.username}
                  </p>
                  <p className="text-slate-400 text-xs font-semibold mt-0.5 truncate max-w-[140px]">
                    @{channel.username}
                  </p>
                </div>

                {/* Visit button */}
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white px-4 py-1.5 rounded-full transition-all duration-300">
                  Visit Channel
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Subscriptions;
