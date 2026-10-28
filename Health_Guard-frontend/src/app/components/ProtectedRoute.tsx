import { Navigate, Outlet } from "react-router";
import { useAuth } from "../state/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  role?: 'client' | 'analyst';
  redirectTo?: string;
}

export function ProtectedRoute({ role, redirectTo = '/' }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (role && user?.role !== role) {
    // Redirect to the correct dashboard based on role
    if (user?.role === 'client') return <Navigate to="/client" replace />;
    if (user?.role === 'analyst') return <Navigate to="/analyst" replace />;
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
