import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  User,
  ShieldPlus,
  ChevronLeft,
  HelpCircle,
  LogOut
} from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../state/AuthContext";

const navItems = [
  { name: "Home", path: "/client", icon: LayoutDashboard, exact: true },
  { name: "Guide", path: "/client/guide", icon: BookOpen },
  { name: "Submit Claim", path: "/client/submit", icon: PlusCircle },
  { name: "Profile", path: "/client/profile", icon: User },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className={`h-screen bg-slate-50 border-r border-slate-200 flex flex-col fixed left-0 top-0 transition-[width] ease-in-out duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="h-16 flex items-center border-b border-slate-200 relative px-6 overflow-hidden">
        <ShieldPlus className="w-6 h-6 text-[#2563eb] shrink-0 mr-3" strokeWidth={2} />
        <span 
          className={`text-lg font-bold text-[#2563eb] whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}
        >
          HealthGuard
        </span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-900 shadow-sm cursor-pointer z-10 transition-all duration-300 ease-in-out ${isCollapsed ? '-right-3' : 'right-4'}`}
        >
          <div className={`transition-transform duration-300 ease-in-out ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}>
             <ChevronLeft size={14} />
          </div>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-8 space-y-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.exact}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-md transition-colors px-2 py-2.5 overflow-hidden ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0 mr-3" />
            <span 
               className={`text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}
            >
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>
      <div className="p-6 flex flex-col gap-2 overflow-hidden">
        <a href="#help" className="flex items-center text-slate-400 hover:text-slate-600 transition-colors" title={isCollapsed ? "Help" : undefined}>
          <HelpCircle className="w-5 h-5 shrink-0 mr-3" />
          <span className={`text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            Help
          </span>
        </a>
        <button 
          onClick={handleLogout}
          className="flex items-center text-slate-400 hover:text-red-600 transition-colors cursor-pointer text-left"
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0 mr-3" />
          <span className={`text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}