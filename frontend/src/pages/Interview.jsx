import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, CheckCircle2, CircleHelp, LoaderCircle, Sparkles, Trophy, XCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Interview() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nextQuestion, setNextQuestion] = useState(null);

  const startInterview = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/start-interview", { interview_type: "technical" });
      setQuestion(data);
      setAnswer("");
      setEvaluation(null);
      setNextQuestion(null);
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return alert("Please enter an answer");
    try {
      setLoading(true);
      const { data } = await api.post("/submit-answer", {
        question: question.question,
        answer,
        topic: question.type || "general",
      });
      setEvaluation(data?.evaluation || null);
      setNextQuestion(data?.next_question || null);

      if (data?.interview_completed) {
        console.log("FINAL INTERVIEW RESPONSE:", data);
        console.log("FINAL REPORT:", data?.report);

        navigate("/report", {
          state: {
            report: data?.report || null,
          },
          replace: true,
        });

        return;
      }
    } catch (error) {
      alert(error?.response?.data?.detail || "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  const moveNext = () => {
    setQuestion(nextQuestion);
    setNextQuestion(null);
    setEvaluation(null);
    setAnswer("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = question
    ? Math.min(Math.round((Number(question.question_number || 1) / Number(question.total_questions || 50)) * 100), 100)
    : 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-7 max-w-[1400px] mx-auto">
        {!question ? (
          <StartScreen onStart={startInterview} loading={loading} />
        ) : (
          <InterviewWorkspace
            question={question}
            answer={answer}
            setAnswer={setAnswer}
            evaluation={evaluation}
            nextQuestion={nextQuestion}
            loading={loading}
            submitAnswer={submitAnswer}
            moveNext={moveNext}
            progress={progress}
          />
        )}
      </div>
    </AppLayout>
  );
}

function StartScreen({ onStart, loading }) {
  return (
    <section className="min-h-[calc(100vh-115px)] flex items-center justify-center">
      <div className="glass rounded-[40px] p-7 md:p-12 w-full max-w-5xl relative overflow-hidden">
        <div className="absolute -right-28 -top-28 w-80 h-80 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="absolute -left-24 -bottom-28 w-80 h-80 rounded-full bg-fuchsia-100/50 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center">
          <div>
            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-amber-500 via-teal-500 to-fuchsia-400 flex items-center justify-center shadow-xl shadow-amber-200/60">
              <Bot size={35} className="text-white" />
            </div>
            <p className="text-[10px] uppercase tracking-[.25em] text-amber-600 font-black mt-7">AI INTERVIEW STUDIO</p>
            <h1 className="text-4xl md:text-6xl font-black text-slate-800 leading-[1.03] mt-3">
              Practice in a space built for focus.
            </h1>
            <p className="text-slate-500 max-w-2xl mt-5 leading-7">
              Work through aptitude, technical, behavioral and HR rounds, then receive an actionable performance report.
            </p>
            <button onClick={onStart} disabled={loading} className="primary-btn mt-8 px-6 py-3.5 inline-flex items-center gap-2">
              {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Bot size={18} />}
              {loading ? "Preparing interview..." : "Start Interview"} <ArrowRight size={16} />
            </button>
          </div>
          <div className="grid gap-3">
            <Feature icon={<CircleHelp />} number="50" title="Questions" text="Structured interview journey" />
            <Feature icon={<Sparkles />} number="AI" title="Evaluation" text="Feedback after every answer" />
            <Feature icon={<Trophy />} number="1" title="Report" text="Final score and improvement map" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, number, title, text }) {
  return <div className="card rounded-3xl p-5 flex items-center gap-4"><div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">{icon}</div><div className="flex-1"><p className="text-xs font-black text-amber-600">{number}</p><p className="font-black text-slate-800">{title}</p><p className="text-xs text-slate-500 mt-1">{text}</p></div></div>;
}

function InterviewWorkspace({ question, answer, setAnswer, evaluation, nextQuestion, loading, submitAnswer, moveNext, progress }) {
  const section = String(question.section || "Interview");
  return (
    <section>
      <div className="glass rounded-[30px] p-5 md:p-6 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black">
              <Sparkles size={13} /> {section}
            </div>
            <p className="text-xs text-slate-400 mt-3">Question {question.question_number || 1} of {question.total_questions || 50}</p>
          </div>
          <div className="md:w-80">
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2"><span>Journey progress</span><span>{progress}%</span></div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-teal-500 to-fuchsia-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_.7fr] gap-5">
        <div className="card rounded-[32px] p-6 md:p-8">
          <p className="text-[10px] uppercase tracking-[.22em] text-teal-600 font-black">QUESTION NODE</p>
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 leading-tight mt-3">{question.question}</h1>

          {Array.isArray(question.options) && question.options.length > 0 ? (
            <div className="mt-7 space-y-3">
              {question.options.map((option, index) => (
                <label key={index} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition ${answer === option ? "bg-amber-50 border-amber-400" : "bg-white border-slate-200 hover:bg-amber-50/40 hover:border-amber-200"}`}>
                  <input type="radio" name="answer" value={option} checked={answer === option} onChange={(e) => setAnswer(e.target.value)} className="accent-amber-600" />
                  <span className="text-sm font-bold text-slate-700">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer here..." className="spatial-input mt-7 h-52 resize-none" />
          )}

          {nextQuestion ? (
            <button onClick={moveNext} className="primary-btn mt-6 px-6 py-3 inline-flex items-center gap-2">Next Question <ArrowRight size={17} /></button>
          ) : (
            <button onClick={submitAnswer} disabled={loading} className="primary-btn mt-6 px-6 py-3 inline-flex items-center gap-2">
              {loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
              {loading ? "Evaluating..." : "Submit Answer"}
            </button>
          )}
        </div>

        <div className="space-y-5">
          <EvaluationCard evaluation={evaluation} />
          <div className="glass rounded-[30px] p-6">
            <p className="text-[10px] uppercase tracking-[.22em] text-amber-600 font-black">INTERVIEW TIP</p>
            <p className="text-sm text-slate-600 leading-6 mt-3">Be concise, explain your reasoning and use a concrete example whenever it strengthens your answer.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EvaluationCard({ evaluation }) {
  if (!evaluation) return <div className="glass rounded-[30px] p-7 min-h-64 flex items-center justify-center text-center"><div><div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center"><Bot size={22} /></div><p className="font-black text-slate-700 mt-4">AI evaluation appears here</p><p className="text-sm text-slate-500 mt-1">Submit your answer to unlock feedback.</p></div></div>;
  const correct = evaluation.is_correct;
  return <div className="glass rounded-[30px] p-6"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${correct ? "bg-emerald-50 text-emerald-600" : correct === false ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-teal-600"}`}>{correct ? <CheckCircle2 size={20} /> : correct === false ? <XCircle size={20} /> : <Sparkles size={20} />}</div><div><p className="font-black text-slate-800">Evaluation</p><p className="text-xs text-slate-400">{correct === true ? "Correct" : correct === false ? "Needs improvement" : "AI feedback"}</p></div></div>
    {evaluation.feedback && <p className="text-sm text-slate-600 leading-6 mt-5"><strong>Feedback:</strong> {evaluation.feedback}</p>}
    {evaluation.correct_answer && <p className="text-sm text-slate-600 leading-6 mt-4"><strong>Correct answer:</strong> {evaluation.correct_answer}</p>}
    {evaluation.explanation && <p className="text-sm text-slate-600 leading-6 mt-4"><strong>Explanation:</strong> {evaluation.explanation}</p>}
    {Array.isArray(evaluation.improvements) && evaluation.improvements.length > 0 && <div className="mt-4"><p className="text-sm font-black text-slate-700">Improve next</p><ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600">{evaluation.improvements.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
  </div>;
}

function AppLayout({ children }) {
  return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" /><Sidebar /><main className="md:pl-[286px] min-h-screen relative z-10"><Navbar />{children}</main></div>;
}

export default Interview;