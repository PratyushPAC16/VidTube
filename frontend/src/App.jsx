import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "./app/slices/authSlice";

import Navbar from "./components/common/Navbar";
import Sidebar from "./components/common/Sidebar";
import Spinner from "./components/common/Spinner";
import ProtectedRoute from "./components/common/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VideoPlayer from "./pages/VideoPlayer";
import Channel from "./pages/Channel";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import SearchResults from "./pages/SearchResults";
import UploadVideo from "./pages/UploadVideo";
import WatchHistory from "./pages/WatchHistory";
import LikedVideos from "./pages/LikedVideos";
import EditProfile from "./pages/EditProfile";
import Tweets from "./pages/Tweets";
import Subscriptions from "./pages/Subscriptions";

function App() {
  const dispatch = useDispatch();
  const { initialized, isAuthenticated } = useSelector((state) => state.auth);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const darkMode = useSelector((state) => state.ui.darkMode);

  // On every app load, check if user session still exists via cookie
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // Show spinner until we know auth state
  if (!initialized) return <Spinner fullScreen />;

  return (
    <div className={`flex flex-col min-h-screen bg-white text-slate-900 ${darkMode ? "dark" : ""}`}>
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/video/:videoId" element={<VideoPlayer />} />
            <Route path="/channel/:username" element={<Channel />} />

            {/* Protected routes — require login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/playlist/:playlistId" element={<PlaylistDetail />} />
              <Route path="/upload" element={<UploadVideo />} />
              <Route path="/history" element={<WatchHistory />} />
              <Route path="/liked" element={<LikedVideos />} />
              <Route path="/settings" element={<EditProfile />} />
              <Route path="/tweets" element={<Tweets />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
            </Route>
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
