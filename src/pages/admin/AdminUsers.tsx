// src/pages/admin/AdminUsers.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Users, Search, Shield, Edit2, Check } from 'lucide-react';

type Role = 'reader' | 'author' | 'admin' | 'vendor' | 'editor' | 'moderator';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  account_type: string;
  is_active: boolean;
  created_at: string;
}

const ROLES: Role[] = ['reader', 'author', 'editor', 'moderator', 'vendor', 'admin'];

const roleBadge: Record<Role, string> = {
  admin:     'bg-red-100 text-red-700 border-red-200',
  author:    'bg-violet-100 text-violet-700 border-violet-200',
  editor:    'bg-blue-100 text-blue-700 border-blue-200',
  vendor:    'bg-orange-100 text-orange-700 border-orange-200',
  moderator: 'bg-teal-100 text-teal-700 border-teal-200',
  reader:    'bg-gray-100 text-gray-600 border-gray-200',
};

const AdminUsers: React.FC = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers]         = useState<UserProfile[]>([]);
  const [filtered, setFiltered]   = useState<UserProfile[]>([]);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [confirmUser, setConfirmUser] = useState<UserProfile | null>(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) { navigate('/'); return; }
    if (!roleLoading && isAdmin) loadUsers();
  }, [isAdmin, roleLoading]);

  useEffect(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    setFiltered(list);
  }, [search, roleFilter, users]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,account_type,is_active,created_at')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setUsers(data || []); setFiltered(data || []); }
    setLoading(false);
  };

  const startEdit = (u: UserProfile) => {
    setEditingId(u.id);
    setPendingRole(u.role);
  };

  const confirmRoleChange = (u: UserProfile) => {
    if (!pendingRole || pendingRole === u.role) { setEditingId(null); return; }
    setConfirmUser({ ...u, role: pendingRole });
  };

  const applyRoleChange = async () => {
    if (!confirmUser) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role: confirmUser.role, updated_at: new Date().toISOString() })
      .eq('id', confirmUser.id);

    if (error) {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    } else {
      setUsers(prev => prev.map(u => u.id === confirmUser.id ? { ...u, role: confirmUser.role } : u));
      toast({ title: 'Role updated', description: `${confirmUser.full_name || confirmUser.email} is now ${confirmUser.role}` });

      // Log audit
      await supabase.from('audit_log').insert({
        action: 'role_change',
        table_name: 'profiles',
        record_id: confirmUser.id,
        new_data: { role: confirmUser.role },
      });

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: confirmUser.id,
        type: 'role_changed',
        title: 'Your role has been updated',
        message: `Your account role has been changed to "${confirmUser.role}" by an admin.`,
      });
    }
    setSaving(false);
    setConfirmUser(null);
    setEditingId(null);
  };

  const toggleActive = async (u: UserProfile) => {
    const newStatus = !u.is_active;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', u.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setUsers(prev => prev.map(p => p.id === u.id ? { ...p, is_active: newStatus } : p));
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">{users.length} registered users</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading users…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{u.full_name || '—'}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {editingId === u.id ? (
                            <div className="flex items-center gap-2">
                              <Select value={pendingRole ?? u.role} onValueChange={(v) => setPendingRole(v as Role)}>
                                <SelectTrigger className="h-7 text-xs w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <button onClick={() => confirmRoleChange(u)} className="text-green-600 hover:text-green-700">
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${roleBadge[u.role]}`}>
                              {u.role === 'admin' && <Shield className="h-3 w-3" />}
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground capitalize">{u.account_type}</td>
                        <td className="py-3 px-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleActive(u)}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingId !== u.id && (
                            <Button size="sm" variant="ghost" onClick={() => startEdit(u)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">No users found</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role change confirmation */}
      <AlertDialog open={!!confirmUser} onOpenChange={(o) => !o && setConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change <strong>{confirmUser?.full_name || confirmUser?.email}</strong> to role <strong>{confirmUser?.role}</strong>?
              The user will be notified of this change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyRoleChange} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminUsers;