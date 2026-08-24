import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, CheckCircle2, CircleAlert, FileText, Sparkles, Target, Trophy } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

const listify = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.keys(value);
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
};

const score = (value) => Math.max(0, Math.min(100, Number(value) || 0));

function Report() {
  const navigate = useNavigate();
  const location = useLocation();

  const passedReport = location.state?.report;

  const [report, setReport] = useState(
    passedReport || null
  );

  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(!passedReport);

  useEffect(() => {
    window.scrollTo(0, 0);

    const load = async () => {
      try {

        // Always load dashboard statistics
        const statsResponse = await api.get("/dashboard");

        setStats(statsResponse.data || {});


        // If Interview.jsx passed the newly generated report,
        // use that report directly.
        if (
          passedReport &&
          typeof passedReport === "object"
        ) {
          console.log(
            "Using latest interview report:",
            passedReport
          );

          setReport(passedReport);
          return;
        }


        // If /report was opened directly,
        // load the saved report from backend.
        const reportResponse = await api.get(
          "/interview-report"
        );

        if (
          reportResponse.data &&
          !reportResponse.data.message
        ) {
          setReport(reportResponse.data);
        } else {
          setReport(null);
        }

      } catch (error) {

        console.error(
          "Failed to load interview report:",
          error
        );

        if (error?.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
        }

      } finally {
        setLoading(false);
      }
    };

    load();

  }, [passedReport, navigate]);

  if (loading) return <AppLayout><div className="min-h-[75vh] flex items-center justify-center"><div className="glass rounded-3xl p-8 text-center"><div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center animate-pulse"><BarChart3 /></div><p className="font-black text-slate-700 mt-4">Building your report...</p></div></div></AppLayout>;

  if (!report) return <AppLayout><div className="min-h-[75vh] flex items-center justify-center p-6"><div className="glass rounded-[34px] p-9 max-w-lg text-center"><CircleAlert size={42} className="text-rose-500 mx-auto" /><h1 className="text-2xl font-black text-slate-800 mt-4">No report available</h1><p className="text-slate-500 mt-2">Complete an interview to generate your first report.</p><button onClick={() => navigate("/interview")} className="primary-btn mt-6 px-5 py-3 inline-flex items-center gap-2">Start Interview <ArrowRight size={16} /></button></div></div></AppLayout>;

  const overall = score(report.overall_score ?? report.final_score ?? report.score);
  const sections = [
    ["Aptitude", score(report.aptitude_score)],
    ["Technical", score(report.technical_score)],
    ["Behavioral", score(report.behavioral_score)],
    ["HR", score(report.hr_score)],
  ];
  const strong = listify(report.strong_topics ?? report.strengths);
  const weak = listify(report.weak_topics ?? report.weaknesses);
  const recommended = listify(report.recommended_topics);
  const questions = Number(report.questions_answered ?? report.history?.length ?? 0);

  return <AppLayout>
    <div className="p-4 md:p-7 max-w-[1500px] mx-auto">
      <section className="glass rounded-[34px] p-6 md:p-8 mb-5 relative overflow-hidden">
        <div className="absolute -right-20 -top-28 w-80 h-80 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-7">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.22em] text-amber-600 font-black"><Sparkles size={14} /> Performance constellation</div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mt-3">Your interview, mapped.</h1>
            <p className="text-slate-500 max-w-2xl mt-4 leading-7">See the current score, section balance, strengths, weak areas and your next preparation targets.</p>
          </div>
          <div className="card rounded-3xl p-5 min-w-48"><p className="text-[10px] uppercase tracking-[.2em] text-slate-400 font-black">Questions answered</p><p className="text-4xl font-black text-amber-600 mt-1">{questions}</p></div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <Metric icon={<Target />} label="Total Interviews" value={stats.total_interviews ?? 0} />
        <Metric icon={<BarChart3 />} label="Average Score" value={`${stats.average_score ?? 0}/100`} />
        <Metric icon={<Trophy />} label="Highest Score" value={`${stats.highest_score ?? stats.best_score ?? 0}/100`} />
        <Metric icon={<CircleAlert />} label="Lowest Score" value={`${stats.lowest_score ?? 0}/100`} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.05fr_.95fr] gap-5 mb-5">
        <div className="card rounded-[32px] p-7 text-center">
          <p className="text-[10px] uppercase tracking-[.22em] text-amber-600 font-black">Current interview</p>
          <div className="relative w-56 h-56 mx-auto mt-6 rounded-full p-3" style={{ background: `conic-gradient(#ea580c ${overall * 3.6}deg, #f6ead2 ${overall * 3.6}deg)` }}>
            <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center border border-slate-100"><span className="text-6xl font-black text-slate-800">{overall}</span><span className="text-sm text-slate-400">out of 100</span></div>
          </div>
          <p className="text-xl font-black text-slate-800 mt-5">{performanceLabel(overall)}</p>
          <div className="max-w-xl mx-auto h-3 bg-slate-100 rounded-full mt-4 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 via-teal-500 to-fuchsia-400 rounded-full" style={{ width: `${overall}%` }} /></div>
        </div>

        <div className="glass rounded-[32px] p-7">
          <div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center"><BarChart3 size={19} /></div><div><h2 className="text-xl font-black text-slate-800">Section balance</h2><p className="text-sm text-slate-500">How each round performed.</p></div></div>
          <div className="space-y-5">{sections.map(([label, value]) => <div key={label}><div className="flex justify-between text-sm font-black text-slate-700"><span>{label}</span><span>{value}/100</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden mt-2"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-teal-500" style={{ width: `${value}%` }} /></div></div>)}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <TopicPanel title="Strong areas" icon={<CheckCircle2 />} items={strong} tone="green" />
        <TopicPanel title="Weak areas" icon={<CircleAlert />} items={weak} tone="rose" />
      </section>

      {recommended.length > 0 && <section className="glass rounded-[30px] p-6 mb-5"><div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><Sparkles size={18} /></div><div><h2 className="text-xl font-black text-slate-800">Recommended preparation</h2><p className="text-sm text-slate-500">Topics to focus on next.</p></div></div><div className="flex flex-wrap gap-2">{recommended.map((topic, i) => <span key={i} className="px-3.5 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black">{String(topic)}</span>)}</div></section>}

      <section className="card rounded-[30px] p-6 mb-5">
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center"><FileText size={18} /></div><div><h2 className="text-xl font-black text-slate-800">AI feedback</h2><p className="text-sm text-slate-500">The most useful part of the report is what you do next.</p></div></div>
        <p className="text-sm md:text-base text-slate-600 leading-7">{report.feedback || report.summary || report.overall_performance || "No feedback available."}</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="glass rounded-[30px] p-6"><p className="text-[10px] uppercase tracking-[.2em] text-emerald-600 font-black">Hiring signal</p><h2 className="text-xl font-black text-slate-800 mt-2">Recommendation</h2><div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-bold text-emerald-700">{report.hire_recommendation || "No recommendation available."}</div></div>
        <div className="glass rounded-[30px] p-6"><p className="text-[10px] uppercase tracking-[.2em] text-amber-600 font-black">Summary</p><h2 className="text-xl font-black text-slate-800 mt-2">Final take</h2><p className="text-sm text-slate-600 leading-6 mt-4">{report.summary || report.overall_performance || "No final summary available."}</p></div>
      </section>

      <div className="flex justify-center pb-6"><button onClick={() => navigate("/interview")} className="primary-btn px-6 py-3 inline-flex items-center gap-2">Practice again <ArrowRight size={16} /></button></div>
    </div>
  </AppLayout>;
}

function Metric({ icon, label, value }) { return <div className="card lift rounded-[26px] p-5"><div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">{icon}</div><p className="text-xs font-bold text-slate-400 mt-5">{label}</p><p className="text-2xl font-black text-slate-800 mt-1">{value}</p></div>; }
function TopicPanel({ title, icon, items, tone }) { const classes = tone === "green" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"; return <div className="card rounded-[30px] p-6"><div className="flex items-center gap-3 mb-5"><div className={`w-10 h-10 rounded-2xl ${classes} flex items-center justify-center`}>{icon}</div><h2 className="text-xl font-black text-slate-800">{title}</h2></div>{items.length ? <div className="space-y-2 max-h-72 overflow-y-auto scroll-soft">{items.map((item, i) => <div key={i} className={`rounded-2xl border px-3 py-2.5 text-sm font-bold ${classes}`}>{String(item)}</div>)}</div> : <p className="text-sm text-slate-400">No topics reported.</p>}</div>; }
function performanceLabel(scoreValue) { if (scoreValue >= 80) return "Strong performance"; if (scoreValue >= 60) return "Good foundation"; if (scoreValue >= 40) return "Developing"; return "Beginner — keep practicing"; }
function AppLayout({ children }) { return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" /><Sidebar /><main className="md:pl-[286px] min-h-screen relative z-10"><Navbar />{children}</main></div>; }
export default Report;