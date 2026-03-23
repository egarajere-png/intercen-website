import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { Seo } from '@/components/Seo';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Users, BookOpen, FileText, ShoppingCart, TrendingUp,
  CheckCircle, XCircle, Clock, Shield, Edit3, Eye,
  Upload, Settings, AlertCircle, Search, RefreshCw,
  LogOut, Save, Camera, User
} from 'lucide-react';

const ADMIN_IDS = [
  '5fbc35df-ae08-4f8a-b0b3-dd6bb4610ebd',
  'e2925b0b-c730-484c-b4f1-1361380bccd3',
];

const ROLES = ['reader', 'author', 'publisher', 'editor', 'moderator', 'admin', 'corporate_user'];

const ROLE_COLORS: Record<string, string> = {
  admin:          'bg-red-100 text-red-700 border-red-200',
  author:         'bg-blue-100 text-blue-700 border-blue-200',
  publisher:      'bg-purple-100 text-purple-700 border-purple-200',
  editor:         'bg-amber-100 text-amber-700 border-amber-200',
  moderator:      'bg-green-100 text-green-700 border-green-200',
  reader:         'bg-gray-100 text-gray-600 border-gray-200',
  corporate_user: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const MAX_BIO  = 500;
const MAX_NAME = 100;
const MAX_AVATAR = 5 * 1024 * 1024;

export default function AdminDashboard() {
  const { userId, role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── data ────────────────────────────────────────────────────────────────────
  const [adminProfile, setAdminProfile]       = useState<any>(null);
  const [stats, setStats]                     = useState({ users: 0, content: 0, pending: 0, orders: 0, revenue: 0 });
  const [users, setUsers]                     = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers]     = useState<any[]>([]);
  const [userSearch, setUserSearch]           = useState('');
  const [publications, setPublications]       = useState<any[]>([]);
  const [contents, setContents]               = useState<any[]>([]);
  const [orders, setOrders]                   = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [savingRole, setSavingRole]           = useState<string | null>(null);
  const [activePublication, setActivePublication] = useState<any>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [processingPub, setProcessingPub]     = useState(false);

  // ── profile edit ────────────────────────────────────────────────────────────
  const [fullName,      setFullName]      = useState('');
  const [bio,           setBio]           = useState('');
  const [phone,         setPhone]         = useState('');
  const [address,       setAddress]       = useState('');
  const [organization,  setOrganization]  = useState('');
  const [department,    setDepartment]    = useState('');
  const [avatarUrl,     setAvatarUrl]     = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64,  setAvatarBase64]  = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  useEffect(() => {
    const q = userSearch.toLowerCase();
    setFilteredUsers(q
      ? users.filter(u =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q))
      : users);
  }, [userSearch, users]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, usersRes, contentRes, pubRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('content').select('id,title,status,content_type,created_at,view_count,download_count').order('created_at', { ascending: false }).limit(50),
        supabase.from('publications').select('*, profiles:submitted_by(full_name,email)').order('created_at', { ascending: false }),
        supabase.from('orders').select('id,status,payment_status,total_price,created_at').order('created_at', { ascending: false }).limit(50),
      ]);

      const p = profileRes.data;
      setAdminProfile(p);
      setFullName(p?.full_name || '');
      setBio(p?.bio || '');
      setPhone(p?.phone || '');
      setAddress(p?.address || '');
      setOrganization(p?.organization || '');
      setDepartment(p?.department || '');
      setAvatarUrl(p?.avatar_url || '');

      const allUsers = usersRes.data || [];
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      setContents(contentRes.data || []);
      setPublications(pubRes.data || []);
      setOrders(ordersRes.data || []);

      const revenue = (ordersRes.data || [])
        .filter((o: any) => o.payment_status === 'paid')
        .reduce((s: number, o: any) => s + parseFloat(o.total_price || 0), 0);

      setStats({
        users:   allUsers.length,
        content: (contentRes.data || []).length,
        pending: (pubRes.data || []).filter((p: any) => p.status === 'pending').length,
        orders:  (ordersRes.data || []).length,
        revenue,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── avatar ──────────────────────────────────────────────────────────────────
  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_AVATAR) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Image ≤ 5 MB required' });
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAvatarBase64(reader.result as string);
      setAvatarPreview(URL.createObjectURL(file));
    };
  };

  // ── save profile ─────────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const payload: any = {
        full_name: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        organization: organization.trim() || undefined,
        department: department.trim() || undefined,
      };
      if (avatarBase64) payload.avatar_base64 = avatarBase64;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile-info-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed');
      }
      const { data: fresh } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      setAdminProfile(fresh);
      setAvatarUrl(fresh?.avatar_url || '');
      setAvatarBase64(null);
      setAvatarPreview(null);
      toast({ title: 'Profile saved', description: 'Your details have been updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── user role ────────────────────────────────────────────────────────────────
  const changeUserRole = async (targetId: string, newRole: string) => {
    if (ADMIN_IDS.includes(targetId) && newRole !== 'admin') {
      toast({ variant: 'destructive', title: 'Protected', description: 'Default admin roles cannot be changed.' });
      return;
    }
    setSavingRole(targetId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', targetId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, role: newRole } : u));
      await supabase.from('notifications').insert({
        user_id: targetId, type: 'general',
        title: 'Your role has been updated',
        message: `An admin changed your role to "${newRole}".`,
      });
      toast({ title: 'Role updated' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setSavingRole(null);
    }
  };

  const toggleActive = async (targetId: string, current: boolean) => {
    if (ADMIN_IDS.includes(targetId)) {
      toast({ variant: 'destructive', title: 'Protected', description: 'Default admins cannot be deactivated.' });
      return;
    }
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', targetId);
    if (!error) setUsers(prev => prev.map(u => u.id === targetId ? { ...u, is_active: !current } : u));
  };

  // ── publication actions ──────────────────────────────────────────────────────
  const handlePubAction = async (pubId: string, action: 'approved' | 'rejected' | 'under_review') => {
    setProcessingPub(true);
    try {
      const updates: any = { status: action, reviewed_by: userId, reviewed_at: new Date().toISOString() };
      if (action === 'rejected') updates.rejection_feedback = rejectionFeedback;
      const { error } = await supabase.from('publications').update(updates).eq('id', pubId);
      if (error) throw error;

      const pub = publications.find(p => p.id === pubId);
      if (pub?.submitted_by) {
        const msgs: Record<string, string> = {
          approved: `Your manuscript "${pub.title}" has been approved!`,
          rejected: `Your manuscript "${pub.title}" was not approved.${rejectionFeedback ? ' Feedback: ' + rejectionFeedback : ''}`,
          under_review: `Your manuscript "${pub.title}" is now under review.`,
        };
        await supabase.from('notifications').insert({
          user_id: pub.submitted_by,
          type: action === 'approved' ? 'content_approved' : action === 'rejected' ? 'content_rejected' : 'general',
          title: action === 'approved' ? 'Manuscript Approved!' : action === 'rejected' ? 'Submission Decision' : 'Under Review',
          message: msgs[action],
        });
      }
      setPublications(prev => prev.map(p => p.id === pubId ? { ...p, status: action } : p));
      setActivePublication(null);
      setRejectionFeedback('');
      toast({ title: 'Updated', description: `Publication marked as ${action}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setProcessingPub(false);
    }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/auth'); };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const pendingPubs = publications.filter(p => p.status === 'pending');

  return (
    <>
      <Seo title="Admin Dashboard | Intercen Books" description="Intercen Books administration panel." />
      <div className="min-h-screen bg-background">
        <Header />

        {/* ── Hero banner ── */}
        <div className="bg-charcoal text-white">
          <div className="container max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {(avatarPreview || avatarUrl) ? (
                    <img src={avatarPreview || avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/40" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-forum text-2xl text-primary">
                      {(adminProfile?.full_name || 'A')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-charcoal flex items-center justify-center">
                    <Shield className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="font-forum text-xl font-bold">{adminProfile?.full_name || 'Administrator'}</h1>
                    <span className="text-xs bg-red-500/20 border border-red-500/30 text-red-300 px-2 py-0.5 rounded-full">ADMIN</span>
                  </div>
                  <p className="text-white/50 text-sm">{adminProfile?.email || 'Administration Panel'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 gap-2" onClick={() => navigate('/upload')}>
                  <Upload className="h-4 w-4" /> Upload Content
                </Button>
                <Button size="sm" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 gap-2" onClick={() => navigate('/content-management')}>
                  <BookOpen className="h-4 w-4" /> Manage Content
                </Button>
                <Button size="sm" variant="ghost" className="text-white/50 hover:text-white gap-2" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 py-8">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Users',    value: stats.users,             icon: Users,        color: 'text-blue-600',   bg: 'bg-blue-50'   },
              { label: 'Content Items',  value: stats.content,           icon: BookOpen,     color: 'text-green-600',  bg: 'bg-green-50'  },
              { label: 'Pending Review', value: stats.pending,           icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50'  },
              { label: 'Orders',         value: stats.orders,            icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Revenue (KES)',  value: stats.revenue.toLocaleString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* ── Pending alert ── */}
          {pendingPubs.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span className="font-semibold text-amber-800 flex-1">
                {pendingPubs.length} manuscript{pendingPubs.length > 1 ? 's' : ''} awaiting review
              </span>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => (document.querySelector('[value="publications"]') as HTMLElement)?.click()}>
                Review Now
              </Button>
            </div>
          )}

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="h-auto p-1 gap-1 bg-muted/50 flex-wrap">
              {[
                { value: 'users',        label: 'Users',        icon: Users     },
                { value: 'publications', label: `Submissions${pendingPubs.length > 0 ? ` (${pendingPubs.length})` : ''}`, icon: FileText },
                { value: 'content',      label: 'Content',      icon: BookOpen  },
                { value: 'orders',       label: 'Orders',        icon: ShoppingCart },
                { value: 'profile',      label: 'My Profile',   icon: User      },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                  <Icon className="h-4 w-4" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── USERS ── */}
            <TabsContent value="users">
              <Card className="shadow-soft">
                <div className="p-6 border-b flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="font-forum text-xl">User Management</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search users…" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 w-60" />
                    </div>
                    <Button size="sm" variant="outline" onClick={loadAll} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground">
                        <th className="text-left px-6 py-3 font-medium">User</th>
                        <th className="text-left px-4 py-3 font-medium">Role</th>
                        <th className="text-left px-4 py-3 font-medium">Account Type</th>
                        <th className="text-left px-4 py-3 font-medium">Joined</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredUsers.map(u => {
                        const isProtected = ADMIN_IDS.includes(u.id);
                        return (
                          <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border" />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-semibold text-sm text-muted-foreground">
                                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{u.full_name || '—'}</div>
                                  <div className="text-xs text-muted-foreground">{u.email || u.id.slice(0, 12) + '…'}</div>
                                </div>
                                {isProtected && <Shield className="h-3.5 w-3.5 text-red-400 ml-1" />}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {isProtected ? (
                                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${ROLE_COLORS['admin']}`}>admin</span>
                              ) : (
                                <select
                                  value={u.role || 'reader'}
                                  disabled={savingRole === u.id}
                                  onChange={e => changeUserRole(u.id, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded-full border font-medium cursor-pointer focus:outline-none ${ROLE_COLORS[u.role] || ROLE_COLORS['reader']}`}
                                >
                                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground text-xs capitalize">{u.account_type || 'personal'}</td>
                            <td className="px-4 py-4 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => toggleActive(u.id, u.is_active)}
                                disabled={isProtected}
                                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-opacity
                                  ${u.is_active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}
                                  ${isProtected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-75'}`}
                              >
                                {u.is_active !== false ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => navigate(`/content?user=${u.id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">No users found.</div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* ── PUBLICATIONS ── */}
            <TabsContent value="publications">
              <div className="space-y-4">
                {publications.length === 0 && (
                  <Card className="p-12 text-center shadow-soft">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground">No manuscript submissions yet.</p>
                  </Card>
                )}
                {publications.map(pub => (
                  <Card key={pub.id} className="p-6 shadow-soft">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="font-forum text-lg">{pub.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            pub.status === 'approved'     ? 'bg-green-50 text-green-700 border-green-200' :
                            pub.status === 'rejected'     ? 'bg-red-50 text-red-700 border-red-200' :
                            pub.status === 'under_review' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'}`}>{pub.status}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          By <span className="font-medium text-foreground">{pub.author_name}</span>
                          {pub.author_email && <span className="text-muted-foreground ml-2">· {pub.author_email}</span>}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{pub.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>{pub.publishing_type} publishing</span>
                          <span>{pub.language}</span>
                          {pub.pages && <span>{pub.pages} pages</span>}
                          <span>Submitted {new Date(pub.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {(pub.status === 'pending' || pub.status === 'under_review') && (
                          <>
                            <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handlePubAction(pub.id, 'approved')}>
                              <CheckCircle className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2 border-blue-200 text-blue-700"
                              onClick={() => handlePubAction(pub.id, 'under_review')}>
                              <Clock className="h-4 w-4" /> Under Review
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2 border-red-200 text-red-700"
                              onClick={() => setActivePublication(pub)}>
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                          </>
                        )}
                        {pub.manuscript_file_url && (
                          <a href={pub.manuscript_file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-2 w-full">
                              <Eye className="h-4 w-4" /> View File
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                    {pub.rejection_feedback && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                        <span className="font-medium">Feedback:</span> {pub.rejection_feedback}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Rejection dialog */}
              {activePublication && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <Card className="p-6 max-w-lg w-full mx-4 shadow-elevated">
                    <h3 className="font-forum text-xl mb-1">Reject Submission</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      "{activePublication.title}" by {activePublication.author_name}
                    </p>
                    <Textarea
                      placeholder="Provide feedback to the author (optional but recommended)…"
                      value={rejectionFeedback}
                      onChange={e => setRejectionFeedback(e.target.value)}
                      rows={4}
                      className="mb-4"
                    />
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => { setActivePublication(null); setRejectionFeedback(''); }}>Cancel</Button>
                      <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={processingPub}
                        onClick={() => handlePubAction(activePublication.id, 'rejected')}>
                        {processingPub ? 'Processing…' : 'Confirm Rejection'}
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ── CONTENT ── */}
            <TabsContent value="content">
              <Card className="shadow-soft">
                <div className="p-6 border-b flex items-center justify-between flex-wrap gap-3">
                  <h2 className="font-forum text-xl">Content Library</h2>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate('/upload')} className="gap-2">
                      <Upload className="h-4 w-4" /> Upload
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/content-management')} className="gap-2">
                      <Settings className="h-4 w-4" /> Manage All
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground">
                        <th className="text-left px-6 py-3 font-medium">Title</th>
                        <th className="text-left px-4 py-3 font-medium">Type</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Views</th>
                        <th className="text-left px-4 py-3 font-medium">Downloads</th>
                        <th className="text-left px-4 py-3 font-medium">Created</th>
                        <th className="text-left px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {contents.map(c => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-6 py-3 font-medium max-w-xs truncate">{c.title}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{c.content_type}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              c.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' :
                              c.status === 'draft'     ? 'bg-muted text-muted-foreground border-border' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{c.view_count || 0}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.download_count || 0}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigate(`/content/${c.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigate(`/content/update/${c.id}`)}><Edit3 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contents.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No content yet. <button className="text-primary underline" onClick={() => navigate('/upload')}>Upload some</button>.
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* ── ORDERS ── */}
            <TabsContent value="orders">
              <Card className="shadow-soft">
                <div className="p-6 border-b">
                  <h2 className="font-forum text-xl">Recent Orders</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground">
                        <th className="text-left px-6 py-3 font-medium">Order ID</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Payment</th>
                        <th className="text-left px-4 py-3 font-medium">Total (KES)</th>
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-muted/20">
                          <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}…</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              o.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                              o.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{o.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${o.payment_status === 'paid' ? 'text-green-600' : 'text-destructive'}`}>
                              {o.payment_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{parseFloat(o.total_price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && <div className="text-center py-12 text-muted-foreground">No orders yet.</div>}
                </div>
              </Card>
            </TabsContent>

            {/* ── MY PROFILE ── */}
            <TabsContent value="profile">
              <div className="max-w-2xl space-y-6">
                <Card className="p-6 shadow-soft">
                  <h2 className="font-forum text-xl mb-6">My Profile</h2>

                  {/* Avatar */}
                  <div className="mb-6">
                    <label className="label-1 mb-2 block">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      {(avatarPreview || avatarUrl) ? (
                        <img src={avatarPreview || avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center font-forum text-3xl text-muted-foreground">
                          {(adminProfile?.full_name || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <input type="file" accept="image/*" ref={fileRef} onChange={handleAvatar} className="hidden" />
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                          <Camera className="h-4 w-4" /> Change Photo
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP · max 5 MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Email read-only */}
                    <div className="space-y-1">
                      <label className="label-1">Email</label>
                      <Input value={adminProfile?.email || ''} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="label-1">Full Name</label>
                        <Input value={fullName} onChange={e => setFullName(e.target.value)} maxLength={MAX_NAME} placeholder="Your name" disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="label-1">Phone</label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7xx xxx xxx" disabled={saving} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="label-1">Address</label>
                      <Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="P.O. Box …" disabled={saving} />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="label-1">Organization</label>
                        <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Intercen Books" disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="label-1">Department</label>
                        <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Editorial" disabled={saving} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="label-1">Role</label>
                      <Input value={role || 'admin'} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                    </div>

                    <div className="space-y-1">
                      <label className="label-1">Bio <span className="text-muted-foreground font-normal">({bio.length}/{MAX_BIO})</span></label>
                      <Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={MAX_BIO} rows={4} placeholder="About you…" disabled={saving} />
                    </div>

                    <div className="flex gap-4 items-center flex-wrap pt-2">
                      <Button onClick={saveProfile} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>Back</Button>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}