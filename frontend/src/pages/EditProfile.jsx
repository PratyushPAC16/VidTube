import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountDetails, updateAvatar, updateCoverImage, changePassword } from "../api/user.api";
import { fetchCurrentUser } from "../app/slices/authSlice";
import { Settings, User, Lock, Image, Camera } from "lucide-react";
import toast from "react-hot-toast";

function EditProfile() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);

  // Account details
  const [accountForm, setAccountForm] = useState({
    fullname: user?.fullname || "",
    email: user?.email || "",
  });

  // Password
  const [passForm, setPassForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateAccountDetails(accountForm);
      dispatch(fetchCurrentUser());
      toast.success("Account details updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    setLoading(true);
    try {
      await changePassword({
        oldPassword: passForm.oldPassword,
        newPassword: passForm.newPassword,
      });
      setPassForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await updateAvatar(formData);
      dispatch(fetchCurrentUser());
      toast.success("Avatar updated!");
    } catch {
      toast.error("Failed to update avatar");
    }
  };

  const handleCoverUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("coverImage", file);
    try {
      await updateCoverImage(formData);
      dispatch(fetchCurrentUser());
      toast.success("Cover image updated!");
    } catch {
      toast.error("Failed to update cover image");
    }
  };

  const tabs = [
    { id: "account", label: "Account", icon: <User size={16} /> },
    { id: "password", label: "Security", icon: <Lock size={16} /> },
    { id: "images", label: "Images", icon: <Image size={16} /> },
  ];

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
          <Settings size={36} className="text-blue-600" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Manage your account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-10 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-500 hover:text-slate-900 hover:bg-white"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Account Tab */}
      {activeTab === "account" && (
        <form onSubmit={handleAccountUpdate} className="space-y-6 max-w-lg">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
            <input
              type="text" value={accountForm.fullname}
              onChange={(e) => setAccountForm({ ...accountForm, fullname: e.target.value })}
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 focus:border-blue-400 transition-all font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label>
            <input
              type="email" value={accountForm.email}
              onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 focus:border-blue-400 transition-all font-bold"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === "password" && (
        <form onSubmit={handlePasswordChange} className="space-y-6 max-w-lg">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Password</label>
            <input
              type="password" value={passForm.oldPassword}
              onChange={(e) => setPassForm({ ...passForm, oldPassword: e.target.value })}
              required
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 focus:border-blue-400 transition-all font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">New Password</label>
            <input
              type="password" value={passForm.newPassword}
              onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
              required
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 focus:border-blue-400 transition-all font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Confirm New Password</label>
            <input
              type="password" value={passForm.confirmPassword}
              onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
              required
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 focus:border-blue-400 transition-all font-bold"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      )}

      {/* Images Tab */}
      {activeTab === "images" && (
        <div className="space-y-10 max-w-lg">
          {/* Avatar */}
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Profile Picture</label>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <img src={user?.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-lg" alt="Avatar" />
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                  <Camera size={24} className="text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpdate} className="hidden" />
                </label>
              </div>
              <div>
                <p className="text-slate-900 font-bold">{user?.fullname}</p>
                <p className="text-slate-500 text-xs font-medium">@{user?.username}</p>
                <p className="text-blue-600 text-xs mt-2 font-bold">Hover to change</p>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cover Image</label>
            <div className="relative group">
              <div className="h-44 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200">
                {user?.coverImage ? (
                  <img src={user.coverImage} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
                    <p className="text-slate-300 text-xs font-black uppercase tracking-widest">No cover image</p>
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-3xl opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                <div className="bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full">
                  <span className="text-slate-900 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Camera size={16} /> Change Cover
                  </span>
                </div>
                <input type="file" accept="image/*" onChange={handleCoverUpdate} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProfile;
