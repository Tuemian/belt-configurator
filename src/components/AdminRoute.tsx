import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading, isAdmin, rolesLoading } = useAuth();
  const location = useLocation();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        ...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <h1 className="text-xl font-semibold">Kein Zugriff</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Diese Seite ist nur für Administrator:innen verfügbar. Bitte wende dich an einen Admin, falls du Zugriff brauchst.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
