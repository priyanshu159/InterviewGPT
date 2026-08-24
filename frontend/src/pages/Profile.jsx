import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, BarChart3, LogOut, Mail, Pencil, Save, Sparkles, Target, User, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "", email: "" });
  const [nameInput, setNameInput] = useState("");
  const [stats, setStats] = useState({ total_interviews: 0, average_score: 0, best_score: 0 });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      try {
        const [me, dashboard] = await Promise.all([api.get("/me"), api.get("/dashboard")]);
        const name = me.data?.name || "User";
        setUser({ name, email: me.data?.email || "" });
        setNameInput(name);
        setStats({
          total_interviews: Number(dashboard.data?.total_interviews) || 0,
          average_score: Number(dashboard.data?.average_score) || 0,
          best_score: Number(dashboard.data?.highest_score ?? dashboard.data?.best_score) || 0,
        });
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
        }
      } finally { setLoading(false); }
    };
    load();
  }, [navigate]);

  const save = async () => {
    const name = nameInput.trim();
    if (!name) return alert("Name cannot be empty.");
    try {
      setSaving(true);
      const { data } = await api.put("/me", { name });
      const updated = data?.user || data || {};
      setUser({ name: updated.name || name, email: updated.email || user.email });
      setNameInput(updated.name || name);
      setEditing(false);
      alert("Profile updated successfully.");
    } catch (error) {
      alert(error?.response?.data?.detail || "Unable to update profile.");
    } finally { setSaving(false); }
  };

  const logout = () => { localStorage.removeItem("token"); navigate("/"); };

  const initials = (user.name || "User").trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  if (loading) return <AppLayout><div className="p-7 max-w-[1200px] mx-auto"><div className="glass rounded-[32px] p-12 text-center animate-pulse">Loading your profile...</div></div></AppLayout>;

  return <AppLayout>
    <div className="p-4 md:p-7 max-w-[1350px] mx-auto">
      <section className="glass rounded-[34px] p-6 md:p-8 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div><div className="text-[10px] uppercase tracking-[.22em] text-amber-600 font-black flex items-center gap-2"><Sparkles size={14} /> Account space</div><h1 className="text-4xl md:text-5xl font-black text-slate-800 mt-3">Your profile.</h1><p className="text-slate-500 mt-3">Your identity and interview journey live here.</p></div>
          <button onClick={logout} className="soft-btn px-5 py-3 inline-flex items-center gap-2 text-rose-500"><LogOut size={17} /> Logout</button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[.75fr_1.25fr] gap-5">
        <div className="card rounded-[32px] p-7">
          <div className="w-28 h-28 rounded-[34px] bg-gradient-to-br from-amber-500 via-teal-500 to-fuchsia-400 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-amber-200/60 mx-auto">{initials}</div>
          {!editing ? <h2 className="text-2xl font-black text-slate-800 text-center mt-5">{user.name}</h2> : <div className="mt-5"><label className="text-sm font-black text-slate-700">Your Name</label><input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="spatial-input mt-2" /></div>}
          <p className="text-center text-sm text-slate-500 mt-1">{user.email}</p>
          <div className="flex justify-center gap-2 mt-5">
            {!editing ? <button onClick={() => setEditing(true)} className="soft-btn px-4 py-2.5 inline-flex items-center gap-2 text-amber-600"><Pencil size={16} /> Edit name</button> : <>
              <button disabled={saving} onClick={save} className="primary-btn px-4 py-2.5 inline-flex items-center gap-2"><Save size={16} /> {saving ? "Saving..." : "Save"}</button>
              <button disabled={saving} onClick={() => { setNameInput(user.name); setEditing(false); }} className="soft-btn px-4 py-2.5 inline-flex items-center gap-2"><X size={16} /> Cancel</button>
            </>}
          </div>
          <div className="border-t border-slate-100 my-6" />
          <Info icon={<User />} label="Name" value={user.name} />
          <Info icon={<Mail />} label="Email" value={user.email || "No email"} />
        </div>

        <div className="space-y-5">
          <div className="glass rounded-[32px] p-7">
            <div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><BarChart3 size={19} /></div><div><h2 className="text-xl font-black text-slate-800">Interview snapshot</h2><p className="text-sm text-slate-500">Your account-level performance.</p></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat icon={<Target />} label="Interviews" value={stats.total_interviews} />
              <Stat icon={<BarChart3 />} label="Average" value={`${stats.average_score}/100`} />
              <Stat icon={<Award />} label="Best" value={`${stats.best_score}/100`} />
            </div>
          </div>
          <div className="card rounded-[32px] p-7 bg-gradient-to-br from-white via-amber-50/70 to-teal-50/70">
            <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-amber-600 shadow-sm"><Sparkles size={22} /></div><div><h2 className="text-xl font-black text-slate-800">Keep the loop going.</h2><p className="text-sm text-slate-500 leading-6 mt-2">Map your resume, practice a round and review the report. Repeating that loop is where the dashboard becomes useful.</p><button onClick={() => navigate("/interview")} className="primary-btn px-5 py-3 mt-5 inline-flex items-center gap-2">Start interview <Target size={16} /></button></div></div>
          </div>
        </div>
      </section>
    </div>
  </AppLayout>;
}

function Info({ icon, label, value }) { return <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-3"><div className="w-10 h-10 rounded-xl bg-white text-amber-600 flex items-center justify-center">{icon}</div><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">{label}</p><p className="text-sm font-black text-slate-700 truncate">{value}</p></div></div>; }
function Stat({ icon, label, value }) { return <div className="rounded-2xl bg-white border border-slate-100 p-4"><div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">{icon}</div><p className="text-xs text-slate-400 font-bold mt-4">{label}</p><p className="text-2xl font-black text-slate-800 mt-1">{value}</p></div>; }
function AppLayout({ children }) { return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" /><Sidebar /><main className="md:pl-[286px] min-h-screen relative z-10"><Navbar />{children}</main></div>; }
export default Profile;