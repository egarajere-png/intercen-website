import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { Seo } from '@/components/Seo';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, BookOpen, Eye, Download, Star,
  ShoppingBag, FileText, User, Calendar, Search,
  Edit3, Trash2, CheckCircle, XCircle, Clock,
  Shield, Mail, Phone, MapPin, Building2
} from 'lucide-react';

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    published:    'bg-green-50 text-green-700 border-green-200',
    draft:        'bg-muted text-muted-foreground border-border',
    archived:     'bg-slate-100 text-slate-500 border-slate-200',
    approved:     'bg-green-50 text-green-700 border-green-200',
    pending:      'bg-amber-50 text-amber-700 border-amber-200',
    under_review: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected:     'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${map[status] ?? map['draft']}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

// ── Role badge ────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: string }) => {
  const map: Record<string, string> = {
    admin:          'bg-red-100 text-red-700 border-red-200',
    author:         'bg-blue-100 text-blue-700 border-blue-200',
    publisher:      'bg-purple-100 text-purple-700 border-purple-200',
    editor:         'bg-amber-100 text-amber-700 border-amber-200',
    moderator:      'bg-green-100 text-green-700 border-green-200',
    reader:         'bg-gray-100 text-gray-600 border-gray-200',
    corporate_user: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${map[role] ?? map['reader']}`}>
      {role}
    </span>
  );
};

export default function UserContentPage() {
  const [searchParams]  = useSearchParams();
  const targetUserId    = searchParams.get('user');
  const navigate        = useNavigate();
  const { userId: adminId, role: adminRole } = useRole();
  const { toast } = useToast();

  const [targetProfile,  setTargetProfile]  = useState<any>(null);
  const [contents,       setContents]       = useState<any[]>([]);
  const [submissions,    setSubmissions]     = useState<any[]>([]);
  const [orders,         setOrders]          = useState<any[]>([]);
  const [loading,        setLoading]         = useState(true);
  const [search,         setSearch]          = useState('');
  const [contentFilter,  setContentFilter]   = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  useEffect(() => {
    if (!targetUserId) return;
    loadAll();
  }, [targetUserId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, contentRes, subsRes, ordersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle(),

        supabase
          .from('content')
          .select('id, title, status, content_type, view_count, download_count, average_rating, price, cover_image_url, created_at, published_at')
          .eq('uploaded_by', targetUserId)
          .order('created_at', { ascending: false }),

        supabase
          .from('publications')
          .select('id, title, status, publishing_type, language, created_at, rejection_feedback')
          .eq('submitted_by', targetUserId)
          .order('created_at', { ascending: false }),

        supabase
          .from('orders')
          .select('id, order_number, status, payment_status, total_price, created_at, order_items(*, content(id, title))')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false }),
      ]);

      setTargetProfile(profileRes.data);
      setContents(contentRes.data || []);
      setSubmissions(subsRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Guard: only admins can access this page ───────────────────────────────
  if (adminRole && adminRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-md mx-auto px-4 py-24 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="font-forum text-2xl mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-6">This page is only accessible to administrators.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (!targetUserId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-md mx-auto px-4 py-24 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="font-forum text-2xl mb-2">No User Specified</h2>
          <p className="text-muted-foreground mb-6">Please provide a user ID in the URL.</p>
          <Button onClick={() => navigate('/profile')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

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

  if (!targetProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-md mx-auto px-4 py-24 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="font-forum text-2xl mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-6">No profile found for ID: {targetUserId}</p>
          <Button onClick={() => navigate('/profile')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // ── Computed values ───────────────────────────────────────────────────────
  const filteredContent = contents
    .filter(c => contentFilter === 'all' || c.status === contentFilter)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));

  const totalViews     = contents.reduce((s, c) => s + (c.view_count || 0), 0);
  const totalDownloads = contents.reduce((s, c) => s + (c.download_count || 0), 0);
  const totalRevenue   = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const publishedCount = contents.filter(c => c.status === 'published').length;

  return (
    <>
      <Seo title={`${targetProfile.full_name || 'User'} — Admin View | Intercen Books`} description="Admin view of user content and activity." />
      <div className="min-h-screen bg-background">
        <Header />

        {/* ── Breadcrumb + back ── */}
        <div className="border-b bg-muted/20">
          <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => navigate('/profile')} className="hover:text-primary flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Admin Dashboard
            </button>
            <span>/</span>
            <span>Users</span>
            <span>/</span>
            <span className="text-foreground font-medium">{targetProfile.full_name || targetUserId.slice(0, 8) + '…'}</span>
          </div>
        </div>

        {/* ── User profile banner ── */}
        <div className="bg-gradient-warm border-b">
          <div className="container max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-5">
                {targetProfile.avatar_url ? (
                  <img
                    src={targetProfile.avatar_url}
                    alt={targetProfile.full_name}
                    className="h-20 w-20 rounded-full object-cover border-2 border-primary/20 shadow-soft"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-forum text-3xl text-primary shadow-soft">
                    {(targetProfile.full_name || targetProfile.email || '?')[0].toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h1 className="font-forum text-2xl text-foreground">
                      {targetProfile.full_name || 'Unnamed User'}
                    </h1>
                    <RoleBadge role={targetProfile.role || 'reader'} />
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      targetProfile.is_active !== false
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {targetProfile.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                    {targetProfile.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {targetProfile.email}
                      </span>
                    )}
                    {targetProfile.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {targetProfile.phone}
                      </span>
                    )}
                    {targetProfile.organization && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> {targetProfile.organization}
                        {targetProfile.department && ` · ${targetProfile.department}`}
                      </span>
                    )}
                    {targetProfile.address && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {targetProfile.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {new Date(targetProfile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  {targetProfile.bio && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-xl line-clamp-2">{targetProfile.bio}</p>
                  )}
                </div>
              </div>

              {/* Quick admin actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Admin Actions</div>
                <Button size="sm" variant="outline" className="gap-2 justify-start"
                  onClick={() => navigate(`/profile`)}>
                  <Shield className="h-4 w-4" /> Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 py-8">

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Published Content', value: publishedCount,              icon: BookOpen,    color: 'text-primary',    bg: 'bg-accent'    },
              { label: 'Total Views',        value: totalViews.toLocaleString(), icon: Eye,         color: 'text-green-600',  bg: 'bg-green-50'  },
              { label: 'Total Downloads',    value: totalDownloads.toLocaleString(), icon: Download, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Total Spent (KES)',  value: totalRevenue.toLocaleString(), icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50'  },
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

          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="h-auto p-1 gap-1 bg-muted/50 flex-wrap">
              {[
                { value: 'content',     label: `Content (${contents.length})`,         icon: BookOpen   },
                { value: 'submissions', label: `Submissions (${submissions.length})`,   icon: FileText   },
                { value: 'orders',      label: `Orders (${orders.length})`,             icon: ShoppingBag },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                  <Icon className="h-4 w-4" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── CONTENT TAB ── */}
            <TabsContent value="content">
              <Card className="shadow-soft">
                <div className="p-5 border-b flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="font-forum text-lg">Uploaded Content</h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status filter */}
                    <div className="flex gap-1">
                      {(['all', 'published', 'draft', 'archived'] as const).map(f => (
                        <button key={f} onClick={() => setContentFilter(f)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize transition-colors ${
                            contentFilter === f
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                          }`}>
                          {f}
                        </button>
                      ))}
                    </div>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search content…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 w-48 h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {filteredContent.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    {contents.length === 0 ? 'This user has not uploaded any content.' : 'No content matches your filters.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-muted-foreground">
                          <th className="text-left px-5 py-3 font-medium">Title</th>
                          <th className="text-left px-4 py-3 font-medium">Type</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Views</th>
                          <th className="text-left px-4 py-3 font-medium">Downloads</th>
                          <th className="text-left px-4 py-3 font-medium">Rating</th>
                          <th className="text-left px-4 py-3 font-medium">Price (KES)</th>
                          <th className="text-left px-4 py-3 font-medium">Created</th>
                          <th className="text-left px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredContent.map(c => (
                          <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {c.cover_image_url ? (
                                  <img src={c.cover_image_url} alt="" className="h-9 w-6 object-cover rounded shadow-sm shrink-0" />
                                ) : (
                                  <div className="h-9 w-6 bg-accent rounded flex items-center justify-center shrink-0">
                                    <BookOpen className="h-3 w-3 text-primary" />
                                  </div>
                                )}
                                <span className="font-medium max-w-[200px] truncate">{c.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{c.content_type}</td>
                            <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{c.view_count || 0}</td>
                            <td className="px-4 py-3 text-muted-foreground">{c.download_count || 0}</td>
                            <td className="px-4 py-3">
                              {c.average_rating > 0 ? (
                                <span className="flex items-center gap-1 text-amber-600 text-xs">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {parseFloat(c.average_rating).toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {c.price > 0 ? parseFloat(c.price).toLocaleString() : 'Free'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                  onClick={() => navigate(`/content/${c.id}`)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                  onClick={() => navigate(`/content/update/${c.id}`)}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── SUBMISSIONS TAB ── */}
            <TabsContent value="submissions">
              <Card className="shadow-soft">
                <div className="p-5 border-b">
                  <h2 className="font-forum text-lg">Manuscript Submissions</h2>
                </div>
                {submissions.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    This user has not submitted any manuscripts.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-muted-foreground">
                          <th className="text-left px-5 py-3 font-medium">Title</th>
                          <th className="text-left px-4 py-3 font-medium">Type</th>
                          <th className="text-left px-4 py-3 font-medium">Language</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Submitted</th>
                          <th className="text-left px-4 py-3 font-medium">Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {submissions.map(sub => (
                          <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3 font-medium max-w-[220px] truncate">{sub.title}</td>
                            <td className="px-4 py-3 text-muted-foreground capitalize">{sub.publishing_type}</td>
                            <td className="px-4 py-3 text-muted-foreground">{sub.language}</td>
                            <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(sub.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px]">
                              {sub.rejection_feedback ? (
                                <span className="text-red-600 line-clamp-2">{sub.rejection_feedback}</span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── ORDERS TAB ── */}
            <TabsContent value="orders">
              <Card className="shadow-soft">
                <div className="p-5 border-b flex items-center justify-between">
                  <h2 className="font-forum text-lg">Order History</h2>
                  <div className="text-sm text-muted-foreground">
                    Total revenue: <span className="font-semibold text-foreground">KES {totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
                {orders.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    This user has not placed any orders.
                  </div>
                ) : (
                  <div className="divide-y">
                    {orders.map(order => (
                      <div key={order.id} className="p-5">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-medium">#{order.order_number}</span>
                            <StatusBadge status={order.status} />
                            <span className={`text-xs font-medium ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                              {order.payment_status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="font-bold text-foreground">KES {parseFloat(order.total_price).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 pl-1">
                          {(order.order_items || []).map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground flex-1">{item.content?.title || 'Content'}</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                                onClick={() => navigate(`/content/${item.content?.id}`)}>
                                <Eye className="h-3 w-3" /> View
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}