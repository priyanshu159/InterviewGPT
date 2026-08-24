import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, Mail, Sparkles } from "lucide-react";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return alert("Please enter email and password.");
    try {
      setLoading(true);
      const { data } = await api.post("/login", { email, password });
      localStorage.setItem("token", data.access_token);
      navigate("/dashboard");
    } catch (error) {
      alert(error?.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Your interview studio is ready."
      subtitle="Sign in to continue your personalized preparation journey."
    >
      <Field icon={<Mail size={17} />} label="Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="spatial-input" />
      </Field>
      <Field icon={<LockKeyhole size={17} />} label="Password">
        <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} type="password" placeholder="Your password" className="spatial-input" />
      </Field>
      <button disabled={loading} onClick={handleLogin} className="primary-btn w-full py-3.5 flex items-center justify-center gap-2">
        {loading ? "Signing in..." : <>Enter workspace <ArrowRight size={17} /></>}
      </button>
      <p className="text-center text-sm text-slate-500 mt-6">
        New here? <Link className="font-black text-amber-600" to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="app-shell min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" />
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.05fr_.95fr] gap-6 items-stretch">
        <section className="hidden lg:flex glass rounded-[38px] p-10 flex-col justify-between overflow-hidden relative">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-amber-100 px-3 py-2 text-[10px] font-black tracking-[.18em] text-amber-700">
              <Sparkles size={13} /> INTERVIEWGPT
            </div>
            <h1 className="text-6xl font-black tracking-tight text-slate-800 mt-10 leading-[1.02]">
              Think clearly.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-teal-500 to-fuchsia-500">Interview confidently.</span>
            </h1>
            <p className="text-slate-500 mt-6 max-w-lg leading-7">
              A spatial workspace for resume intelligence, AI interviews, performance reports and continuous improvement.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Resume map", "AI practice", "Performance"].map((item, index) => (
              <div key={item} className="rounded-2xl bg-white/70 border border-white p-4">
                <div className="text-xs font-black text-slate-700">{String(index + 1).padStart(2, "0")}</div>
                <p className="text-xs text-slate-500 mt-2">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-[38px] p-7 md:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-teal-500 flex items-center justify-center shadow-lg shadow-amber-200/60">
              <Sparkles className="text-white" size={21} />
            </div>
            <div>
              <p className="font-black text-slate-800">Interview<span className="text-amber-600">GPT</span></p>
              <p className="text-xs text-slate-400">AI interview workspace</p>
            </div>
          </div>
          <div className="text-[10px] tracking-[.22em] text-amber-600 font-black">{eyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 mt-3">{title}</h2>
          <p className="text-slate-500 leading-6 mt-3">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </div>
  );
}

function Field({ icon, label, children }) {
  return <label className="block mb-5"><span className="flex items-center gap-2 text-sm font-black text-slate-700 mb-2">{icon}{label}</span>{children}</label>;
}

export default Login;