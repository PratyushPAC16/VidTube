import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { Home, History, ThumbsUp, PlaySquare, User, Upload, MessageCircle, Settings, Bell } from "lucide-react";

function Sidebar() {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!sidebarOpen) return null;

  const mainLinks = [
    { name: "Home", icon: <Home size={20} />, path: "/" },
  ];

  const userLinks = isAuthenticated ? [
    { name: "Upload", icon: <Upload size={20} />, path: "/upload" },
    { name: "Subscriptions", icon: <Bell size={20} />, path: "/subscriptions" },
    { name: "Playlists", icon: <PlaySquare size={20} />, path: "/playlists" },
    { name: "Liked Videos", icon: <ThumbsUp size={20} />, path: "/liked" },
    { name: "History", icon: <History size={20} />, path: "/history" },
    { name: "Community", icon: <MessageCircle size={20} />, path: "/tweets" },
    { name: "My Channel", icon: <User size={20} />, path: `/channel/${user?.username}` },
    { name: "Settings", icon: <Settings size={20} />, path: "/settings" },
  ] : [];

  const linkClass = (path) =>
    `flex items-center gap-4 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      location.pathname === path
        ? "bg-blue-50 text-blue-600 shadow-sm"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <aside className="fixed left-0 top-[61px] bottom-0 w-64 bg-white border-r border-slate-200 p-4 transition-all duration-300 z-40 overflow-y-auto">
      {/* Main */}
      <div className="space-y-1">
        {mainLinks.map((link) => (
          <Link key={link.name} to={link.path} className={linkClass(link.path)}>
            {link.icon} {link.name}
          </Link>
        ))}
      </div>

      {/* User Section */}
      {userLinks.length > 0 && (
        <>
          <div className="border-t border-slate-100 my-4" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 mb-2">You</p>
          <div className="space-y-1">
            {userLinks.map((link) => (
              <Link key={link.name} to={link.path} className={linkClass(link.path)}>
                {link.icon} {link.name}
              </Link>
            ))}
          </div>
        </>
      )}

      {!isAuthenticated && (
        <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Sign in to like videos, comment, and subscribe to your favorite creators.
          </p>
          <Link
            to="/login"
            className="block mt-4 text-center text-blue-600 border border-blue-600/30 hover:bg-blue-600 hover:text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            SIGN IN
          </Link>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
