import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, CheckCircle2, FileText, MessageCircle, Send, Sparkles, Target, Upload, XCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function ResumeIntelligence() {
  const [resume, setResume] = useState(null);
  const [jdText, setJdText] = useState("");
  const [atsScore, setAtsScore] = useState(0);
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState([]);
  const [missingSkills, setMissingSkills] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatLoading]);

  const analyzeResume = async () => {
    if (!resume) return alert("Please upload a resume.");
    if (!jdText.trim()) return alert("Please enter a Job Description.");
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", resume);
      formData.append("jd_text", jdText);
      const { data } = await api.post("/analyze-resume", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setAtsScore(Number(data?.match_score) || 0);
      setSummary(data?.candidate_summary || "");
      setStrengths(Array.isArray(data?.strengths) ? data.strengths : []);
      setMissingSkills(Array.isArray(data?.missing_skills) ? data.missing_skills : []);
      setRecommendations(Array.isArray(data?.learning_recommendations) ? data.learning_recommendations : []);
    } catch (error) {
      alert(error?.response?.data?.detail || "Resume analysis failed.");
    } finally { setLoading(false); }
  };

  const askResumeQuestion = async () => {
    const text = chatQuestion.trim();
    if (!text || chatLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatQuestion("");
    setChatLoading(true);
    try {
      const { data } = await api.post("/chat", { question: text });
      setMessages((prev) => [...prev, { role: "assistant", content: data?.answer || "I could not generate an answer." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong while answering your question." }]);
    } finally { setChatLoading(false); }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-7 max-w-[1500px] mx-auto">
        <section className="glass rounded-[34px] p-6 md:p-8 mb-6">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.22em] text-amber-600 font-black"><Sparkles size={14} /> Resume intelligence lab</div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 mt-3">Turn your resume into an interview map.</h1>
              <p className="text-slate-500 mt-4 max-w-3xl leading-7">Upload the resume and target role. The AI will surface alignment, missing skills and practical next steps.</p>
            </div>
            <div className="rounded-3xl bg-white/80 border border-white p-5 min-w-48">
              <p className="text-[10px] uppercase tracking-[.2em] font-black text-slate-400">MATCH SIGNAL</p>
              <p className="text-4xl font-black text-amber-600 mt-1">{atsScore}<span className="text-base text-slate-400">/100</span></p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.05fr_.95fr] gap-5 mb-6">
          <div className="card rounded-[30px] p-6 md:p-7">
            <Header icon={<Upload />} title="Resume + target role" subtitle="Give the AI the context it needs." />
            <label className="block rounded-3xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-teal-50 p-6 cursor-pointer hover:border-amber-300 transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white text-amber-600 flex items-center justify-center shadow-sm"><FileText size={21} /></div>
                <div><p className="font-black text-slate-700">{resume ? resume.name : "Choose your resume PDF"}</p><p className="text-xs text-slate-500 mt-1">PDF format recommended</p></div>
              </div>
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setResume(e.target.files?.[0] || null)} />
            </label>
            <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the Job Description here..." className="spatial-input mt-4 h-52 resize-none" />
            <button onClick={analyzeResume} disabled={loading} className="primary-btn mt-4 px-6 py-3.5 inline-flex items-center gap-2">{loading ? "Analyzing..." : <><Target size={18} /> Analyze Resume</>}</button>
          </div>

          <div className="glass rounded-[30px] p-6 md:p-7">
            <Header icon={<Target />} title="Alignment snapshot" subtitle="What the current analysis says." />
            <div className="flex items-center gap-6">
              <div className="relative w-36 h-36 rounded-full p-2 shrink-0" style={{ background: `conic-gradient(#ea580c ${atsScore * 3.6}deg,#f6ead2 ${atsScore * 3.6}deg)` }}>
                <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center"><span className="text-4xl font-black text-slate-800">{atsScore}</span><span className="text-xs text-slate-400">match</span></div>
              </div>
              <div><p className="font-black text-slate-800">{atsScore >= 75 ? "Strong alignment" : atsScore >= 50 ? "Moderate alignment" : "Needs improvement"}</p><p className="text-sm text-slate-500 leading-6 mt-2">Use the missing-skill panel below to focus your preparation.</p></div>
            </div>
            <div className="mt-7 rounded-2xl bg-white/80 border border-slate-100 p-4"><p className="text-[10px] uppercase tracking-[.2em] font-black text-slate-400">Candidate summary</p><p className="text-sm text-slate-600 leading-6 mt-2">{summary || "Analyze your resume to generate a candidate summary."}</p></div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <TopicList title="Strengths" icon={<CheckCircle2 />} items={strengths} tone="green" empty="Your strengths will appear after analysis." />
          <TopicList title="Missing skills" icon={<XCircle />} items={missingSkills} tone="rose" empty="Missing skills will appear after analysis." />
          <TopicList title="Learning recommendations" icon={<Sparkles />} items={recommendations} tone="blue" empty="Recommendations will appear after analysis." />
        </section>

        <section className="glass rounded-[30px] p-5 md:p-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <Header icon={<MessageCircle />} title="Resume RAG chat" subtitle="Ask questions about the resume context." />
            <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-black">Context aware</span>
          </div>
          <div className="rounded-[26px] bg-white/72 border border-slate-100 min-h-72 max-h-[520px] overflow-y-auto p-4 md:p-5 scroll-soft">
            {messages.length === 0 && <div className="min-h-64 flex items-center justify-center text-center"><div><div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center"><Bot size={22} /></div><p className="font-black text-slate-700 mt-4">Ask anything about your resume.</p><p className="text-sm text-slate-500 mt-1">Try: “Which skills are missing for this role?”</p></div></div>}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-3xl px-4 py-3 ${message.role === "user" ? "bg-gradient-to-r from-amber-500 to-teal-500 text-white rounded-br-md" : "bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-md"}`}>
                    {message.role === "assistant" ? <div className="prose prose-sm max-w-none"><ReactMarkdown>{message.content}</ReactMarkdown></div> : <p className="text-sm leading-6">{message.content}</p>}
                  </div>
                </div>
              ))}
              {chatLoading && <div className="flex"><div className="bg-slate-50 border border-slate-100 rounded-3xl rounded-bl-md px-4 py-3 text-sm text-slate-400">AI is thinking...</div></div>}
              <div ref={chatBottomRef} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input value={chatQuestion} onChange={(e) => setChatQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askResumeQuestion()} placeholder="Ask a question..." className="spatial-input" />
            <button onClick={askResumeQuestion} disabled={chatLoading || !chatQuestion.trim()} className="primary-btn w-12 shrink-0 flex items-center justify-center"><Send size={17} /></button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Header({ icon, title, subtitle }) {
  return <div className="flex items-center gap-3 mb-5"><div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">{icon}</div><div><h2 className="text-xl font-black text-slate-800">{title}</h2><p className="text-sm text-slate-500 mt-0.5">{subtitle}</p></div></div>;
}

function TopicList({ title, icon, items, tone, empty }) {
  const tones = { green: "bg-emerald-50 border-emerald-100 text-emerald-700", rose: "bg-rose-50 border-rose-100 text-rose-700", blue: "bg-amber-50 border-amber-100 text-amber-700" };
  return <div className="card rounded-[30px] p-6"><div className="flex items-center gap-3 mb-5"><div className={`w-10 h-10 rounded-2xl ${tones[tone]} flex items-center justify-center`}>{icon}</div><h2 className="text-xl font-black text-slate-800">{title}</h2></div>{items.length ? <div className="space-y-2 max-h-64 overflow-y-auto scroll-soft">{items.map((item, i) => <div key={i} className={`px-3 py-2.5 rounded-2xl border text-sm font-bold ${tones[tone]}`}>{String(item)}</div>)}</div> : <p className="text-sm text-slate-400 leading-6">{empty}</p>}</div>;
}

function AppLayout({ children }) {
  return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" /><Sidebar /><main className="md:pl-[286px] min-h-screen relative z-10"><Navbar />{children}</main></div>;
}

export default ResumeIntelligence;