import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Bot, FileText, Sparkles, Target, Trophy, TrendingUp, TriangleAlert } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function normalizeTopics(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.keys(value);
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      try {
        const { data: response } = await api.get("/dashboard");
        setData(response || {});
      } catch (error) {
        console.error("Dashboard API error:", error);
        if (error?.response?.status === 401) navigate("/");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const weakTopics = normalizeTopics(data?.weak_topics);
  const avg = Number(data?.average_score) || 0;
  const best = Number(data?.highest_score ?? data?.best_score) || 0;
  const total = Number(data?.total_interviews) || 0;

  const scoreBars = useMemo(() => [
    { label: "Average", value: avg },
    { label: "Best", value: best },
    { label: "Target", value: 80 },
  ], [avg, best]);

  return (
    <AppLayout>
      <div className="p-4 md:p-7 max-w-[1500px] mx-auto">
        <section className="glass rounded-[34px] p-6 md:p-8 relative overflow-hidden mb-6">
          <div className="absolute -right-24 -top-32 w-96 h-96 rounded-full bg-teal-100/60 blur-3xl" />
          <div className="absolute right-40 -bottom-32 w-72 h-72 rounded-full bg-fuchsia-100/50 blur-3xl" />
          <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.22em] text-amber-600 font-black">
                <Sparkles size={14} /> Candidate command center
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-800 mt-4 leading-[1.02]">
                Your interview<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-teal-500 to-fuchsia-500">in one view.</span>
              </h1>
              <p className="text-slate-500 max-w-2xl mt-5 leading-7">
                Track your interview history, understand your score, find weak areas and jump back into practice.
              </p>
            </div>
            <button onClick={() => navigate("/interview")} className="primary-btn px-5 py-3.5 inline-flex items-center justify-center gap-2 shrink-0">
              <Bot size={18} /> Start AI Interview <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <Metric icon={<Target />} label="Total Interviews" value={loading ? "—" : total} note="Completed sessions" tone="blue" />
          <Metric icon={<BarChart3 />} label="Average Score" value={loading ? "—" : `${avg}/100`} note="Across your history" tone="violet" />
          <Metric icon={<Trophy />} label="Best Score" value={loading ? "—" : `${best}/100`} note="Your strongest run" tone="mint" />
          <Metric icon={<TriangleAlert />} label="Weak Topics" value={loading ? "—" : weakTopics.length} note="Topics to revisit" tone="rose" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_.95fr] gap-5 mb-6">
          <div className="glass rounded-[30px] p-6 md:p-7">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] tracking-[.22em] uppercase text-amber-600 font-black">Performance field</p>
                <h2 className="text-2xl font-black text-slate-800 mt-1">Score trajectory</h2>
                <p className="text-sm text-slate-500 mt-1">A simple view of where you stand today.</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-amber-600"><TrendingUp size={19} /></div>
            </div>
            <div className="h-64 flex items-end gap-5 md:gap-8 px-2">
              {scoreBars.map((bar) => (
                <div key={bar.label} className="flex-1 h-full flex flex-col justify-end items-center">
                  <div className="text-xs font-black text-slate-700 mb-2">{bar.value}/100</div>
                  <div className="w-full max-w-20 h-48 rounded-t-[22px] bg-gradient-to-t from-amber-100 via-teal-100 to-white border border-amber-100 p-1 flex items-end">
                    <div className="w-full rounded-[18px] bg-gradient-to-t from-amber-500 to-teal-400 transition-all" style={{ height: `${Math.max(5, Math.min(bar.value, 100))}%` }} />
                  </div>
                  <div className="text-xs font-bold text-slate-400 mt-3">{bar.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card rounded-[30px] p-6 md:p-7">
            <p className="text-[10px] tracking-[.22em] uppercase text-teal-600 font-black">Readiness pulse</p>
            <h2 className="text-2xl font-black text-slate-800 mt-1">Current level</h2>
            <div className="relative w-44 h-44 mx-auto my-7 rounded-full p-3" style={{ background: `conic-gradient(#ea580c ${Math.min(avg, 100) * 3.6}deg, #f6ead2 ${Math.min(avg, 100) * 3.6}deg)` }}>
              <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center border border-slate-100">
                <span className="text-4xl font-black text-slate-800">{Math.round(avg)}</span>
                <span className="text-xs text-slate-400">out of 100</span>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-teal-50 border border-amber-100 p-4 text-center">
              <p className="text-sm font-black text-slate-700">{performanceLabel(avg)}</p>
              <p className="text-xs text-slate-500 mt-1">Keep practicing to move your score upward.</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card rounded-[30px] p-6">
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="text-xl font-black text-slate-800">Focus topics</h2><p className="text-sm text-slate-500 mt-1">Areas that need attention.</p></div>
              <FileText size={19} className="text-teal-500" />
            </div>
            {weakTopics.length ? (
              <div className="flex flex-wrap gap-2">{weakTopics.slice(0, 12).map((topic, i) => <span key={i} className="px-3 py-2 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold">{String(topic)}</span>)}</div>
            ) : (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700 font-semibold">No weak topics are currently reported.</div>
            )}
          </div>
          <div className="card rounded-[30px] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><Sparkles size={18} /></div>
              <div><h2 className="text-xl font-black text-slate-800">Next best action</h2><p className="text-sm text-slate-500">Use the workspace as a loop.</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[["01","Map","/resume"],["02","Practice","/interview"],["03","Review","/report"]].map(([n,label,path]) => (
                <button key={path} onClick={() => navigate(path)} className="text-left rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-100 p-4 transition">
                  <span className="text-[10px] font-black text-amber-600">{n}</span>
                  <p className="text-sm font-black text-slate-700 mt-2">{label}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Metric({ icon, label, value, note, tone }) {
  const tones = { blue: "bg-amber-50 text-amber-600", violet: "bg-teal-50 text-teal-600", mint: "bg-emerald-50 text-emerald-600", rose: "bg-rose-50 text-rose-600" };
  return <div className="card lift rounded-[26px] p-5"><div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tones[tone]}`}>{icon}</div><p className="text-xs text-slate-400 font-bold mt-5">{label}</p><p className="text-3xl font-black text-slate-800 mt-1">{value}</p><p className="text-xs text-slate-400 mt-1">{note}</p></div>;
}

function performanceLabel(score) {
  if (score >= 80) return "Strong interview readiness";
  if (score >= 60) return "Good foundation";
  if (score >= 40) return "Developing";
  return "Beginner — keep building";
}

function AppLayout({ children }) {
  return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" /><Sidebar /><main className="md:pl-[286px] min-h-screen relative z-10"><Navbar />{children}</main></div>;
}

export default Dashboard;