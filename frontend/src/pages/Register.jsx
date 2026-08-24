import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return alert("Please fill all fields.");
    if (password.length < 6) return alert("Password must contain at least 6 characters.");
    try {
      setLoading(true);
      await api.post("/register", { name, email, password });
      alert("Registration successful. Please login.");
      navigate("/");
    } catch (error) {
      alert(error?.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="CREATE YOUR SPACE"
      title="Build your interview command center."
      subtitle="Create an account and keep your interview history, reports and progress connected."
    >
      <Field icon={<UserRound size={17} />} label="Full Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className="spatial-input" placeholder="Your name" />
      </Field>
      <Field icon={<Mail size={17} />} label="Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="spatial-input" placeholder="you@example.com" />
      </Field>
      <Field icon={<LockKeyhole size={17} />} label="Password">
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="spatial-input" placeholder="At least 6 characters" />
      </Field>
      <button disabled={loading} onClick={handleRegister} className="primary-btn w-full py-3.5 flex items-center justify-center gap-2">
        {loading ? "Creating account..." : <>Create workspace <ArrowRight size={17} /></>}
      </button>
      <p className="text-center text-sm text-slate-500 mt-6">
        Already registered? <Link className="font-black text-amber-600" to="/">Sign in</Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="app-shell min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" />
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.05fr_.95fr] gap-6">
        <section className="hidden lg:flex glass rounded-[38px] p-10 flex-col justify-between min-h-[650px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-teal-100 px-3 py-2 text-[10px] font-black tracking-[.18em] text-teal-700"><Sparkles size={13} /> AI PREPARATION</div>
            <h1 className="text-6xl font-black text-slate-800 mt-10 leading-[1.02]">
              One workspace.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-amber-500 to-fuchsia-500">Every interview step.</span>
            </h1>
            <p className="text-slate-500 mt-6 max-w-lg leading-7">Keep your resume context, interview practice and performance insights together in one spatial workspace.</p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-white to-teal-50 border border-teal-100 p-5">
            <p className="text-xs font-black text-teal-700">DESIGNED FOR PROGRESS</p>
            <p className="text-sm text-slate-600 mt-2 leading-6">Your account keeps your interview analytics separated from other candidates.</p>
          </div>
        </section>
        <section className="glass rounded-[38px] p-7 md:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-amber-500 flex items-center justify-center shadow-lg shadow-teal-200/60"><Sparkles className="text-white" size={21} /></div>
            <div><p className="font-black text-slate-800">Interview<span className="text-amber-600">GPT</span></p><p className="text-xs text-slate-400">AI interview workspace</p></div>
          </div>
          <div className="text-[10px] tracking-[.22em] text-teal-600 font-black">{eyebrow}</div>
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

export default Register;