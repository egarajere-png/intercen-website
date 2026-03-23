import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { Loader2 } from 'lucide-react';


import AdminDashboard from '@/pages/AdminDashboard';
import AuthorDashboard from '@/pages/Authordashboard';
import ReaderDashboard from '@/pages/Readerdashboard';


const ProfilePage: React.FC = () => {
  const { role, userId, loading } = useRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) return <Navigate to="/auth" replace />;

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'author' || role === 'publisher') return <AuthorDashboard />;
  return <ReaderDashboard />;
};

export default ProfilePage;
