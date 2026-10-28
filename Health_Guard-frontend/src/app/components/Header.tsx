import { Search, User, LogOut } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../state/AuthContext";
import { useState } from "react";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  
  const isAnalyst = user?.role === 'analyst';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleProfileClick = () => {
    if (isAnalyst) {
      navigate('/analyst/settings');
    } else {
      navigate('/client/profile');
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    const currentPath = location.pathname;
    if (currentPath === '/client' || currentPath === '/analyst' || currentPath.startsWith('/client/') || currentPath.startsWith('/analyst/')) {
      const base = currentPath.startsWith('/analyst') ? '/analyst' : '/client';
      if (value.trim()) {
        navigate(`${base}?q=${encodeURIComponent(value.trim())}`);
      } else {
        navigate(base);
      }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex-1 max-w-2xl">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" strokeWidth={1.5} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search patients, claims, or providers..."
            className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-slate-200 rounded-lg text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4 ml-4">
        {user && (
          <span className="text-sm text-slate-600 font-medium hidden sm:block">
            {user.name}
          </span>
        )}
        <NotificationBell />
        <button 
          onClick={handleProfileClick}
          title="Profile"
          className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors overflow-hidden"
        >
          {user?.profile_photo ? (
            <img
              src={`/${user.profile_photo.replace('profile-photos/', 'storage/profile-photos/')}`}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
        <button 
          onClick={handleLogout}
          title="Logout"
          className="p-2 text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
