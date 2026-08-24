import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Search, Sparkles, UserRound } from "lucide-react";
import api from "../services/api";

const titles = {
  "/dashboard": ["Overview", "Your interview performance at a glance"],
  "/resume": ["Resume Intelligence", "Map your resume to the role you want"],
  "/interview": ["AI Interview", "Practice inside your personalized interview studio"],
  "/report": ["Interview Report", "Turn your performance into your next plan"],
  "/profile": ["Profile", "Manage your account and interview journey"],
};

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState({ name: "Candidate", email: "" });
  const menuRef = useRef(null);

  const [title, subtitle] = titles[pathname] || ["InterviewGPT", "Your AI interview workspace"];

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/me");
        setUser({ name: data?.name || "Candidate", email: data?.email || "" });
      } catch {
        // Pages can still render if /me is unavailable.
      }
    };
    if (localStorage.getItem("token")) load();
  }, [pathname]);

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const initials = (user.name || "C")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 px-4 md:px-8 py-3.5 bg-white/62 backdrop-blur-2xl border-b border-white/80">
      <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-amber-500 font-black">
            <Sparkles size={13} />
            InterviewGPT Studio
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 truncate mt-0.5">{title}</h2>
          <p className="hidden sm:block text-xs md:text-sm text-slate-500 truncate">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 w-52">
            <Search size={16} className="text-slate-400" />
            <input className="bg-transparent outline-none text-sm w-full" placeholder="Find something..." />
          </div>

          <button className="hidden sm:flex w-10 h-10 rounded-2xl bg-white/80 border border-slate-200 items-center justify-center text-slate-500 hover:text-amber-600">
            <Bell size={17} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((value) => !value)}
              className="flex items-center gap-2.5 rounded-2xl bg-white/85 border border-slate-200/90 px-2.5 py-2 shadow-sm hover:shadow-md transition"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-teal-500 text-white flex items-center justify-center text-xs font-black">
                {initials}
              </div>
              <div className="hidden sm:block text-left max-w-32">
                <p className="text-[10px] text-slate-400 font-bold">SIGNED IN</p>
                <p className="text-sm font-extrabold text-slate-700 truncate">{user.name}</p>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-300/30 p-2">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-teal-50 mb-1">
                  <p className="text-sm font-black text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{user.email || "Signed-in candidate"}</p>
                </div>
                <button onClick={() => { setOpen(false); navigate("/profile"); }} className="w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700">
                  <UserRound size={17} /> Profile
                </button>
                <button onClick={logout} className="w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50">
                  <LogOut size={17} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;