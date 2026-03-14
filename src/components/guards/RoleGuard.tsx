import { Navigate, useLocation } from 'react-router-dom';
import { useRole, UserRole } from '@/contexts/RoleContext';
import { Loader2 } from 'lucide-react';

interface Props {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ allowedRoles, children, redirectTo = '/auth' }: Props) {
  const { role, userId, loading } = useRole();
  const location = useLocation();

  // Wait for session to resolve — never redirect while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No session at all → go to auth
  if (!userId) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  // Logged in but role not in allowed list → go home
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Convenience wrappers
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']} redirectTo="/">
      {children}
    </RoleGuard>
  );
}

export function AuthorGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin', 'author', 'publisher']}>
      {children}
    </RoleGuard>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={[
        'reader', 'author', 'admin', 'vendor',
        'editor', 'moderator', 'publisher', 'corporate_user',
      ]}
    >
      {children}
    </RoleGuard>
  );
}