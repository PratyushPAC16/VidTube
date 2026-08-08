import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getUserPlaylists, createPlaylist, deletePlaylist, updatePlaylist } from "../api/playlist.api";
import Spinner from "../components/common/Spinner";
import toast from "react-hot-toast";
import { Plus, ListVideo, Trash2, Edit2 } from "lucide-react";

function Playlists() {
  const { user } = useSelector((state) => state.auth);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  useEffect(() => {
    loadPlaylists();
  }, [user]);

  const loadPlaylists = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const res = await getUserPlaylists(user._id);
      setPlaylists(res.data.data || []);
    } catch {
      // silenced
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createPlaylist(form);
      setForm({ name: "", description: "" });
      setCreating(false);
      loadPlaylists();
      toast.success("Playlist created!");
    } catch {
      toast.error("Failed to create playlist");
    }
  };

  const handleDelete = async (playlistId) => {
    if (!confirm("Delete this playlist?")) return;
    try {
      await deletePlaylist(playlistId);
      loadPlaylists();
      toast.success("Playlist deleted!");
    } catch {
      toast.error("Failed to delete playlist");
    }
  };

  const handleUpdate = async (playlistId) => {
    try {
      await updatePlaylist(playlistId, editForm);
      setEditingId(null);
      loadPlaylists();
      toast.success("Playlist updated!");
    } catch {
      toast.error("Failed to update playlist");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-100">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
           <ListVideo size={32} className="text-blue-600" />
           Your Collections
        </h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-full text-xs font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all tracking-widest uppercase"
        >
          <Plus size={18} /> New Collection
        </button>
      </div>

      {/* Create Modal */}
      {creating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
           <form onSubmit={handleCreate} className="bg-white rounded-3xl p-10 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
             <div className="flex items-center gap-4 mb-2">
                <div className="bg-blue-50 p-3 rounded-2xl"><ListVideo className="text-blue-600" size={24}/></div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter">New Collection</h3>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 px-1 uppercase tracking-widest">Title</label>
                <input
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Favorite Music" required
                  className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100 focus:border-blue-400 transition-all"
                />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 px-1 uppercase tracking-widest">Description</label>
                <textarea
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this collection about?" required
                  className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100 focus:border-blue-400 transition-all resize-none"
                  rows={4}
                />
             </div>
             <div className="flex gap-4 pt-4">
               <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95">Create</button>
               <button type="button" onClick={() => setCreating(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">Discard</button>
             </div>
           </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
           <div className="bg-white rounded-3xl p-10 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
             <h3 className="text-xl font-black text-slate-900 tracking-tighter">Edit Playlist</h3>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 px-1 uppercase tracking-widest">Title</label>
                <input
                  value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100 focus:border-blue-400 transition-all"
                />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 px-1 uppercase tracking-widest">Description</label>
                <textarea
                  value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100 focus:border-blue-400 transition-all resize-none"
                  rows={4}
                />
             </div>
             <div className="flex gap-4 pt-4">
               <button onClick={() => handleUpdate(editingId)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95">Save</button>
               <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">Cancel</button>
             </div>
           </div>
        </div>
      )}

      {/* Playlist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {playlists.map((pl) => (
          <div key={pl._id} className="bg-white hover:bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-100 transition-all group hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-900/5 shadow-sm">
            <Link to={`/playlist/${pl._id}`} className="block relative aspect-video bg-slate-100 overflow-hidden m-4 rounded-2xl mb-0">
              {pl.videos?.[0]?.thumbnail ? (
                <img src={pl.videos[0].thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" alt="Preview"/>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                   <ListVideo size={48} className="opacity-40" />
                   <span className="font-black text-[10px] tracking-widest uppercase opacity-40">EMPTY COLLECTION</span>
                </div>
              )}
              <div className="absolute top-4 right-4 bg-white/40 backdrop-blur-md text-slate-900 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-xl">
                 {pl.videos?.length || 0} VIDEOS
              </div>
            </Link>
            <div className="p-7 flex justify-between items-start gap-4">
               <div className="flex-1">
                  <h3 className="text-slate-900 text-xl font-black group-hover:text-blue-600 transition-colors line-clamp-1 tracking-tighter">{pl.name}</h3>
                  <p className="text-slate-500 text-xs mt-2.5 line-clamp-2 leading-relaxed font-medium mb-4 italic">{pl.description}</p>
               </div>
               <div className="flex flex-col gap-2 mt-1 opacity-20 group-hover:opacity-100 transition-opacity">
                   <button
                     onClick={(e) => { e.preventDefault(); setEditingId(pl._id); setEditForm({ name: pl.name, description: pl.description }); }}
                     className="text-slate-400 hover:text-blue-600 p-1.5 transition-all hover:bg-white rounded-lg shadow-sm"
                   >
                     <Edit2 size={16}/>
                   </button>
                   <button
                     onClick={(e) => { e.preventDefault(); handleDelete(pl._id); }}
                     className="text-slate-400 hover:text-red-500 p-1.5 transition-all hover:bg-white rounded-lg shadow-sm"
                   >
                     <Trash2 size={16}/>
                   </button>
               </div>
            </div>
          </div>
        ))}
        {playlists.length === 0 && !loading && (
          <div className="col-span-full py-40 text-center text-slate-200 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/20 flex flex-col items-center gap-8">
             <div className="bg-white p-6 rounded-full shadow-2xl shadow-blue-900/5"><ListVideo size={56} className="text-slate-100" /></div>
             <div className="max-w-sm">
                <p className="text-slate-900 font-black uppercase tracking-tighter text-2xl mb-2 italic">Clean Slate</p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-loose">Organize your content into collections to keep track of what matters most to you.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Playlists;
