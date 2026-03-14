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
  ShoppingBag, User, BookOpen, Eye, Star, Save,
  LogOut, ChevronRight, Package, Camera, Search
} from 'lucide-react';

const MAX_BIO    = 500;
const MAX_NAME   = 100;
const MAX_AVATAR = 5 * 1024 * 1024;
const ACCOUNT_TYPES = ['personal', 'corporate', 'institutional'];

export default function ReaderDashboard() {
  const { userId, role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile,       setProfile]       = useState<any>(null);
  const [orders,        setOrders]        = useState<any[]>([]);
  const [recentContent, setRecentContent] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  // profile edit
  const [fullName,      setFullName]      = useState('');
  const [bio,           setBio]           = useState('');
  const [phone,         setPhone]         = useState('');
  const [address,       setAddress]       = useState('');
  const [organization,  setOrganization]  = useState('');
  const [department,    setDepartment]    = useState('');
  const [accountType,   setAccountType]   = useState('personal');
  const [avatarUrl,     setAvatarUrl]     = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64,  setAvatarBase64]  = useState<string | null>(null);

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, ordersRes, contentRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('orders').select('*, order_items(*, content(id, title, cover_image_url))').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('content').select('id,title,cover_image_url,content_type,price,average_rating').eq('status', 'published').order('created_at', { ascending: false }).limit(6),
      ]);

      const p = profileRes.data;
      setProfile(p);
      setFullName(p?.full_name || '');
      setBio(p?.bio || '');
      setPhone(p?.phone || '');
      setAddress(p?.address || '');
      setOrganization(p?.organization || '');
      setDepartment(p?.department || '');
      setAccountType(p?.account_type || 'personal');
      setAvatarUrl(p?.avatar_url || '');
      setOrders(ordersRes.data || []);
      setRecentContent(contentRes.data || []);
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
        account_type: accountType,
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

  const paidOrders  = orders.filter(o => o.payment_status === 'paid');
  const totalSpent  = paidOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const booksOwned  = paidOrders.reduce((s, o) => s + (o.order_items?.length || 0), 0);
  const isOrgAcct   = accountType === 'corporate' || accountType === 'institutional';

  return (
    <>
      <Seo
        title="My Profile | Intercen Books"
        description="Manage your Intercen Books account, orders, and personal details."
        canonical="https://www.intercenbooks.com/profile"
      />
      <div className="min-h-screen bg-background">
        <Header />

        {/* ── Hero ── */}
        <div className="bg-gradient-warm border-b">
          <div className="container max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {(avatarPreview || avatarUrl) ? (
                    <img src={avatarPreview || avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/30 shadow-soft" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-forum text-2xl text-primary shadow-soft">
                      {(profile?.full_name || 'R')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="font-forum text-2xl text-foreground">{profile?.full_name || 'My Account'}</h1>
                  <p className="body-2 text-muted-foreground capitalize">{role} · {accountType} account</p>
                </div>
              </div>
              <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="container max-w-5xl mx-auto px-4 py-8">

          {/* ── Stats ── */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Books Owned',      value: booksOwned,                   icon: BookOpen,    color: 'text-primary',    bg: 'bg-accent'    },
              { label: 'Orders Placed',    value: orders.length,                icon: Package,     color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Total Spent (KES)',value: totalSpent.toLocaleString(),  icon: ShoppingBag, color: 'text-green-600',  bg: 'bg-green-50'  },
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

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="h-auto p-1 gap-1 bg-muted/50">
              {[
                { value: 'profile', label: 'My Profile',  icon: User       },
                { value: 'orders',  label: `Orders (${orders.length})`, icon: ShoppingBag },
                { value: 'browse',  label: 'Browse Books', icon: BookOpen  },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                  <Icon className="h-4 w-4" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── PROFILE ── */}
            <TabsContent value="profile">
              <Card className="p-6 shadow-soft max-w-2xl">
                <h2 className="font-forum text-xl mb-6">My Profile</h2>

                {/* Avatar */}
                <div className="mb-6">
                  <label className="label-1 mb-2 block">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    {(avatarPreview || avatarUrl) ? (
                      <img src={avatarPreview || avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center font-forum text-3xl text-muted-foreground">
                        {(profile?.full_name || 'R')[0].toUpperCase()}
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
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} maxLength={MAX_NAME} placeholder="Mwangi Kamau" disabled={saving} />
                    </div>
                    <div className="space-y-1">
                      <label className="label-1">Phone</label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 712 345 678" disabled={saving} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="label-1">Account Type</label>
                    <select
                      value={accountType}
                      onChange={e => setAccountType(e.target.value)}
                      disabled={saving}
                      className="w-full border rounded px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {ACCOUNT_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {isOrgAcct && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="label-1">Organization</label>
                        <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Company / Institution" disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="label-1">Department</label>
                        <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" disabled={saving} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="label-1">Address</label>
                    <Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="P.O. Box 12345-00100, Nairobi, Kenya" disabled={saving} />
                  </div>

                  <div className="space-y-1">
                    <label className="label-1">Role</label>
                    <Input value={role || 'reader'} readOnly disabled className="bg-muted/50 cursor-not-allowed capitalize" />
                    {role === 'reader' && (
                      <p className="text-xs text-muted-foreground">
                        Want to publish? <button className="text-primary underline" onClick={() => navigate('/publish')}>Learn about publishing with us</button>.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="label-1">Bio <span className="text-muted-foreground font-normal">({bio.length}/{MAX_BIO})</span></label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={MAX_BIO} rows={4} placeholder="Passionate about reading…" disabled={saving} />
                  </div>

                  <div className="flex gap-4 items-center flex-wrap pt-2">
                    <Button onClick={saveProfile} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>Back</Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ── ORDERS ── */}
            <TabsContent value="orders">
              <Card className="shadow-soft">
                <div className="p-6 border-b">
                  <h2 className="font-forum text-xl">Order History</h2>
                </div>
                {orders.length === 0 ? (
                  <div className="p-12 text-center">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">No orders yet.</p>
                    <Button onClick={() => navigate('/books')} className="gap-2">
                      <BookOpen className="h-4 w-4" /> Browse Books
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {orders.map(order => (
                      <div key={order.id} className="p-6">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div>
                            <span className="font-mono text-sm font-semibold">Order #{order.order_number}</span>
                            <span className="ml-3 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              order.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{order.payment_status}</span>
                            <span className="font-bold text-foreground text-sm">Ksh {parseFloat(order.total_price).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="font-medium text-muted-foreground">Status: <span className="text-foreground">{order.status}</span></div>
                          {(order.order_items || []).map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3">
                              {item.content?.cover_image_url && (
                                <img src={item.content.cover_image_url} alt="" className="h-8 w-6 object-cover rounded" />
                              )}
                              <span className="text-foreground flex-1">{item.content?.title || 'Untitled Content'}</span>
                              <span className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</span>
                              {order.payment_status === 'paid' ? (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 ml-auto"
                                  onClick={() => item.content?.id && navigate(`/content/${item.content.id}`)}>
                                  <Eye className="h-3 w-3" /> Access Content
                                </Button>
                              ) : (
                                <span className="ml-auto text-xs text-muted-foreground">Pay to access</span>
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

            {/* ── BROWSE ── */}
            <TabsContent value="browse">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-forum text-xl">Recently Added</h2>
                <Button variant="outline" onClick={() => navigate('/books')} className="gap-2">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {recentContent.length === 0 ? (
                <Card className="p-12 text-center shadow-soft">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No books available yet.</p>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentContent.map(item => (
                    <Card key={item.id}
                      className="shadow-soft overflow-hidden hover:shadow-elevated transition-all duration-300 cursor-pointer"
                      onClick={() => navigate(`/content/${item.id}`)}>
                      {item.cover_image_url ? (
                        <img src={item.cover_image_url} alt={item.title} className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 bg-gradient-warm flex items-center justify-center">
                          <BookOpen className="h-10 w-10 text-primary/30" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-medium text-sm line-clamp-2 mb-2">{item.title}</h3>
                        <div className="flex items-center justify-between">
                          {item.average_rating > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {parseFloat(item.average_rating).toFixed(1)}
                            </div>
                          )}
                          <span className="text-sm font-bold text-primary ml-auto">
                            {item.price > 0 ? `KES ${parseFloat(item.price).toLocaleString()}` : 'Free'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              <div className="mt-6 text-center">
                <Button size="lg" onClick={() => navigate('/books')} className="gap-2">
                  <Search className="h-4 w-4" /> Browse All Books
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}