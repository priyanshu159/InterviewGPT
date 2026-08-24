import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react";

const items = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "/resume", label: "Resume Intelligence", icon: FileText },
  { path: "/interview", label: "AI Interview", icon: Bot },
  { path: "/report", label: "Reports", icon: BarChart3 },
];

function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <>
      <aside className="hidden md:flex fixed left-5 top-5 bottom-5 z-40 w-[258px] side-rail rounded-[32px] p-4 flex-col">
        <div className="px-3 pt-2 pb-7">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ea580c] via-[#0d9488] to-[#d946ef] flex items-center justify-center shadow-lg shadow-amber-200/60">
              <Sparkles size={21} className="text-white" />
              <span className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-white border-2 border-[#fbd9a0]" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-slate-800">
                Interview<span className="text-[#ea580c]">GPT</span>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">
                AI interview studio
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 mb-2 text-[10px] uppercase tracking-[.22em] text-slate-400 font-black">
          Workspace
        </div>

        <nav className="space-y-1.5">
          {items.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-amber-50 to-teal-50 text-[#c2410c] shadow-sm ring-1 ring-amber-100"
                    : "text-slate-500 hover:bg-white/80 hover:text-slate-800"
                }`
              }
            >
              <span className="w-9 h-9 rounded-xl bg-white/75 border border-white flex items-center justify-center group-hover:scale-105 transition">
                <Icon size={18} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-1.5">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold ${
                isActive
                  ? "bg-teal-50 text-teal-700"
                  : "text-slate-500 hover:bg-white/80 hover:text-slate-800"
              }`
            }
          >
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
              <UserRound size={18} />
            </span>
            Profile
          </NavLink>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition"
          >
            <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <LogOut size={18} />
            </span>
            Logout
          </button>

          <div className="mt-3 rounded-2xl p-4 bg-gradient-to-br from-white to-amber-50 border border-amber-100">
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs">
              <Sparkles size={14} />
              AI SPACE
            </div>
            <p className="text-[11px] text-slate-500 leading-5 mt-2">
              Analyze. Practice. Improve. Track your interview journey.
            </p>
          </div>
        </div>
      </aside>

      <div className="md:hidden sticky top-0 z-50 px-3 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-teal-500 flex items-center justify-center">
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="font-black text-slate-800">
              Interview<span className="text-amber-600">GPT</span>
            </span>
          </NavLink>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {[...items, { path: "/profile", label: "Profile", icon: UserRound }].map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                title={label}
                className={({ isActive }) =>
                  `p-2.5 rounded-xl ${
                    isActive ? "bg-amber-50 text-amber-600" : "text-slate-400"
                  }`
                }
              >
                <Icon size={18} />
              </NavLink>
            ))}
            <button onClick={logout} title="Logout" className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-50">
              <LogOut size={18} />
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

export default Sidebar;