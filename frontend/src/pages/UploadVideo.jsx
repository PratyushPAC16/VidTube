import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { publishVideo } from "../api/video.api";
import { Upload, Film, Image, FileText, X } from "lucide-react";
import toast from "react-hot-toast";

function UploadVideo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleThumbChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      setThumbPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) return toast.error("Video file is required");
    if (!thumbnail) return toast.error("Thumbnail is required");
    if (!form.title.trim()) return toast.error("Title is required");

    const formData = new FormData();
    formData.append("videoFile", videoFile);
    formData.append("thumbnail", thumbnail);
    formData.append("title", form.title);
    formData.append("description", form.description);

    setLoading(true);
    try {
      const res = await publishVideo(formData);
      toast.success("Video published successfully!");
      navigate(`/video/${res.data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
            <Upload size={36} className="text-blue-600" />
            Upload Video
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Share your content with the world</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Video File */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Film size={14} /> Video File
            </label>
            {!videoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                <Upload size={48} className="text-slate-300 group-hover:text-blue-400 transition-colors mb-4" />
                <p className="text-slate-400 font-bold text-sm">Click to select video file</p>
                <p className="text-slate-300 text-xs mt-1">MP4, WebM, MOV supported</p>
                <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
              </label>
            ) : (
              <div className="relative">
                <video src={videoPreview} controls className="w-full rounded-3xl border border-slate-100 shadow-lg max-h-96 bg-black" />
                <button type="button" onClick={() => { setVideoFile(null); setVideoPreview(null); }} className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors">
                  <X size={18} className="text-red-500" />
                </button>
                <p className="text-xs text-slate-400 mt-2 font-medium px-2">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Image size={14} /> Thumbnail
            </label>
            {!thumbPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                <Image size={36} className="text-slate-300 group-hover:text-blue-400 transition-colors mb-3" />
                <p className="text-slate-400 font-bold text-sm">Click to select thumbnail</p>
                <p className="text-slate-300 text-xs mt-1">JPG, PNG, WebP supported</p>
                <input type="file" accept="image/*" onChange={handleThumbChange} className="hidden" />
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={thumbPreview} className="h-48 rounded-2xl border border-slate-100 shadow-lg object-cover" alt="Thumbnail preview" />
                <button type="button" onClick={() => { setThumbnail(null); setThumbPreview(null); }} className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg hover:bg-red-50 transition-colors">
                  <X size={14} className="text-red-500" />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} /> Title
            </label>
            <input
              type="text" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Give your video a great title..."
              required
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 focus:border-blue-400 transition-all font-bold text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell viewers about your video..."
              required rows={5}
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 focus:border-blue-400 transition-all font-medium resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest"
            >
              {loading ? "Uploading..." : "Publish Video"}
            </button>
            <button
              type="button" onClick={() => navigate(-1)}
              className="px-10 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadVideo;
