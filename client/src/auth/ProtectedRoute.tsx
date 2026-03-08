import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { AppUserRole } from './AuthContext';
import { BrandHeader } from '../components/BrandHeader';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AppUserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <BrandHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-neutral-300 border-t-black" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <BrandHeader />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <img src="/logo.ico" alt="" className="mx-auto mb-4 h-12 w-12 opacity-60" />
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Access restricted
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Your account does not have permission to view this area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

