import React, { useEffect, useState, useRef } from 'react';
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
  BookOpen, FileText, TrendingUp, Eye, Download,
  Star, CheckCircle, Plus, Edit3, User, BarChart2,
  ShoppingBag, LogOut, Save, Camera
} from 'lucide-react';

const MAX_BIO    = 500;
const MAX_NAME   = 100;
const MAX_AVATAR = 5 * 1024 * 1024;

export default function AuthorDashboard() {
  const { userId, role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile,       setProfile]       = useState<any>(null);
  const [submissions,   setSubmissions]   = useState<any[]>([]);
  const [works,         setWorks]         = useState<any[]>([]);
  const [orders,        setOrders]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);

  // profile edit
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

  const totalViews     = works.reduce((s, b) => s + (b.view_count || 0), 0);
  const totalDownloads = works.reduce((s, b) => s + (b.download_count || 0), 0);
  const avgRating      = works.length > 0
    ? (works.reduce((s, b) => s + parseFloat(b.average_rating || 0), 0) / works.length).toFixed(1)
    : '—';

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, subsRes, worksRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('publications').select('*').eq('submitted_by', userId).order('created_at', { ascending: false }),
        supabase.from('content').select('id,title,status,content_type,view_count,download_count,average_rating,price,cover_image_url,created_at').eq('uploaded_by', userId).order('created_at', { ascending: false }),
        supabase.from('orders').select('id,order_number,status,payment_status,total_price,created_at,order_items(*, content(id,title))').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      const p = profileRes.data;
      setProfile(p);
      setFullName(p?.full_name || '');
      setBio(p?.bio || '');
      setPhone(p?.phone || '');
      setAddress(p?.address || '');
      setOrganization(p?.organization || '');
      setDepartment(p?.department || '');
      setAvatarUrl(p?.avatar_url || '');
      setSubmissions(subsRes.data || []);
      setWorks(worksRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > MAX_AVATAR) {
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

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const payload: any = {
        full_name:    fullName.trim() || undefined,
        bio:          bio.trim() || undefined,
        phone:        phone.trim() || undefined,
        address:      address.trim() || undefined,
        organization: organization.trim() || undefined,
        department:   department.trim() || undefined,
      };
      if (avatarBase64) payload.avatar_base64 = avatarBase64;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile-info-edit`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed');
      }
      const { data: fresh } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      setProfile(fresh);
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

  const pendingCount   = submissions.filter(s => s.status === 'pending').length;
  const approvedCount  = submissions.filter(s => s.status === 'approved').length;
  const publishedCount = works.filter(w => w.status === 'published').length;

  return (
    <>
      <Seo title="Author Dashboard | Intercen Books" description="Manage your manuscripts and published works." />
      <div className="min-h-screen bg-background">
        <Header />

        {/* ── Hero ── */}
        <div className="bg-gradient-warm border-b">
          <div className="container max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {(avatarPreview || avatarUrl) ? (
                    <img src={avatarPreview || avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/30 shadow-soft" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-forum text-2xl text-primary shadow-soft">
                      {(profile?.full_name || 'A')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h1 className="font-forum text-2xl text-foreground">{profile?.full_name || 'Author Dashboard'}</h1>
                    <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full capitalize">{role}</span>
                  </div>
                  <p className="body-2 text-muted-foreground">Author Portal · Manage your works &amp; submissions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => navigate('/publish/submit')} className="gap-2">
                  <Plus className="h-4 w-4" /> Submit Manuscript
                </Button>
                <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-8">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Published Works', value: publishedCount,              icon: BookOpen, color: 'text-primary',    bg: 'bg-accent'   },
              { label: 'Total Views',     value: totalViews.toLocaleString(), icon: Eye,      color: 'text-green-600',  bg: 'bg-green-50' },
              { label: 'Downloads',       value: totalDownloads.toLocaleString(), icon: Download, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Avg. Rating',     value: avgRating,                   icon: Star,     color: 'text-amber-600',  bg: 'bg-amber-50' },
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

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="h-auto p-1 gap-1 bg-muted/50 flex-wrap">
              {[
                { value: 'overview',     label: 'Overview',     icon: BarChart2  },
                { value: 'submissions',  label: `Submissions${submissions.length > 0 ? ` (${submissions.length})` : ''}`, icon: FileText },
                { value: 'works',        label: 'My Works',     icon: BookOpen   },
                { value: 'orders',       label: 'My Orders',    icon: ShoppingBag },
                { value: 'profile',      label: 'Edit Profile', icon: User       },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                  <Icon className="h-4 w-4" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── OVERVIEW ── */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 shadow-soft">
                  <h3 className="font-forum text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Submission Status
                  </h3>
                  <div className="space-y-3 mb-6">
                    {[
                      { label: 'Pending Review', count: pendingCount,                                              dot: 'bg-amber-400' },
                      { label: 'Approved',       count: approvedCount,                                             dot: 'bg-green-400' },
                      { label: 'Under Review',   count: submissions.filter(s => s.status === 'under_review').length, dot: 'bg-blue-400'  },
                      { label: 'Rejected',       count: submissions.filter(s => s.status === 'rejected').length,   dot: 'bg-red-400'   },
                    ].map(({ label, count, dot }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                        <span className="body-2 text-muted-foreground flex-1">{label}</span>
                        <span className="font-bold text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full gap-2" onClick={() => navigate('/publish/submit')}>
                    <Plus className="h-4 w-4" /> Submit New Manuscript
                  </Button>
                </Card>

                <Card className="p-6 shadow-soft">
                  <h3 className="font-forum text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" /> Top Performing Works
                  </h3>
                  {works.filter(w => w.status === 'published').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                      No published works yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {works.filter(w => w.status === 'published').slice(0, 5).map(work => (
                        <div key={work.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => navigate(`/content/${work.id}`)}>
                          {work.cover_image_url ? (
                            <img src={work.cover_image_url} alt="" className="h-10 w-7 object-cover rounded shadow-sm" />
                          ) : (
                            <div className="h-10 w-7 bg-accent rounded flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{work.title}</div>
                            <div className="text-xs text-muted-foreground">{work.view_count || 0} views · {work.download_count || 0} downloads</div>
                          </div>
                          {work.average_rating > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {parseFloat(work.average_rating).toFixed(1)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* ── SUBMISSIONS ── */}
            <TabsContent value="submissions">
              <div className="space-y-4">
                {submissions.length === 0 ? (
                  <Card className="p-12 text-center shadow-soft">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">No manuscripts submitted yet.</p>
                    <Button onClick={() => navigate('/publish/submit')} className="gap-2">
                      <Plus className="h-4 w-4" /> Submit Your First Manuscript
                    </Button>
                  </Card>
                ) : submissions.map(sub => (
                  <Card key={sub.id} className="p-6 shadow-soft">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="font-forum text-lg">{sub.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            sub.status === 'approved'     ? 'bg-green-50 text-green-700 border-green-200' :
                            sub.status === 'rejected'     ? 'bg-red-50 text-red-700 border-red-200' :
                            sub.status === 'under_review' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>{sub.status}</span>
                        </div>
                        <p className="body-2 text-muted-foreground line-clamp-2 mb-2">{sub.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>{sub.publishing_type} publishing</span>
                          <span>{sub.language}</span>
                          <span>Submitted {new Date(sub.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {sub.status === 'approved' && (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle className="h-4 w-4" /> Approved
                        </span>
                      )}
                    </div>
                    {sub.rejection_feedback && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                        <span className="font-medium">Feedback:</span> {sub.rejection_feedback}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── MY WORKS ── */}
            <TabsContent value="works">
              {works.length === 0 ? (
                <Card className="p-12 text-center shadow-soft">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No content uploaded yet.</p>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {works.map(work => (
                    <Card key={work.id} className="shadow-soft overflow-hidden hover:shadow-elevated transition-all duration-300">
                      {work.cover_image_url ? (
                        <img src={work.cover_image_url} alt={work.title} className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 bg-gradient-warm flex items-center justify-center">
                          <BookOpen className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-medium text-sm line-clamp-2">{work.title}</h3>
                          <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${
                            work.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'
                          }`}>{work.status}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{work.view_count || 0}</span>
                          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{work.download_count || 0}</span>
                          {work.average_rating > 0 && (
                            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{parseFloat(work.average_rating).toFixed(1)}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => navigate(`/content/${work.id}`)}>View</Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => navigate(`/content/update/${work.id}`)}>Edit</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── ORDERS ── */}
            <TabsContent value="orders">
              <Card className="shadow-soft">
                <div className="p-6 border-b">
                  <h2 className="font-forum text-xl">Purchase History</h2>
                </div>
                {orders.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    No orders yet.{' '}
                    <button className="text-primary underline" onClick={() => navigate('/books')}>Browse books</button>.
                  </div>
                ) : (
                  <div className="divide-y">
                    {orders.map(order => (
                      <div key={order.id} className="p-6">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div>
                            <span className="font-mono text-sm font-medium">#{order.order_number}</span>
                            <span className="ml-3 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              order.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'
                            }`}>{order.payment_status}</span>
                            <span className="font-bold text-foreground">KES {parseFloat(order.total_price).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(order.order_items || []).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{item.content?.title || 'Content'}</span>
                              {order.payment_status === 'paid' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                  onClick={() => navigate(`/content/${item.content?.id}`)}>
                                  <Eye className="h-3 w-3" /> Access
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── EDIT PROFILE ── */}
            <TabsContent value="profile">
              <div className="max-w-2xl">
                <Card className="p-6 shadow-soft">
                  <h2 className="font-forum text-xl mb-6">Edit Profile</h2>

                  {/* Avatar */}
                  <div className="mb-6">
                    <label className="label-1 mb-2 block">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      {(avatarPreview || avatarUrl) ? (
                        <img src={avatarPreview || avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center font-forum text-3xl text-primary">
                          {(profile?.full_name || 'A')[0].toUpperCase()}
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
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="label-1">Full Name</label>
                        <Input value={fullName} onChange={e => setFullName(e.target.value)} maxLength={MAX_NAME} disabled={saving} />
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
                        <Input value={organization} onChange={e => setOrganization(e.target.value)} disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="label-1">Department</label>
                        <Input value={department} onChange={e => setDepartment(e.target.value)} disabled={saving} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="label-1">Role</label>
                      <Input value={role || ''} readOnly disabled className="bg-muted/50 cursor-not-allowed capitalize" />
                      <p className="text-xs text-muted-foreground">Role is assigned by admin.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="label-1">Bio <span className="text-muted-foreground font-normal">({bio.length}/{MAX_BIO})</span></label>
                      <Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={MAX_BIO} rows={4} placeholder="Tell readers about yourself…" disabled={saving} />
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