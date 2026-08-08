import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/user.api";
import toast from "react-hot-toast";

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    fullname: "",
    password: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [coverImage, setCoverImage] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!avatar) return toast.error("Avatar is required");

    const formData = new FormData();
    Object.keys(form).forEach(key => formData.append(key, form[key]));
    formData.append("avatar", avatar);
    if (coverImage) formData.append("coverImage", coverImage);

    setLoading(true);
    try {
      await registerUser(formData);
      toast.success("Account created successfully! Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-10 border border-slate-100 shadow-2xl shadow-blue-900/5">
        <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tighter">Registration</h1>
        <p className="text-slate-500 text-sm mb-10 font-medium tracking-tight">Join the next-gen video community</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" name="username" placeholder="Username (@)"
            value={form.username} onChange={handleChange} required
            className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 font-medium"
          />
          <input
            type="text" name="fullname" placeholder="Full Name"
            value={form.fullname} onChange={handleChange} required
            className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 font-medium"
          />
          <input
            type="email" name="email" placeholder="Email Address"
            value={form.email} onChange={handleChange} required
            className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 font-medium"
          />
          <input
            type="password" name="password" placeholder="Password"
            value={form.password} onChange={handleChange} required
            className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100 border border-slate-200 font-medium"
          />

          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-bold text-slate-400 block px-1 uppercase tracking-widest">Avatar Image (Required)</label>
            <input
              type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])}
              className="w-full text-slate-500 text-xs cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block px-1 uppercase tracking-widest">Cover Image (Optional)</label>
            <input
              type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files[0])}
              className="w-full text-slate-500 text-xs cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all font-bold"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 mt-4"
          >
            {loading ? "Creating Identity..." : "Create Account"}
          </button>
        </form>
        <p className="text-slate-500 text-sm mt-8 text-center font-bold">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">Sign In Instead</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
