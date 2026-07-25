import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export function AdminProtectedRoute() {
  const { user, loading, isAdmin } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff7f2_0%,#f8f9fa_45%,#eef2f7_100%)] text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function AdminGuestRoute() {
  const { user, loading, isAdmin } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff7f2_0%,#f8f9fa_45%,#eef2f7_100%)] text-gray-500">
        Loading…
      </div>
    );
  }

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
