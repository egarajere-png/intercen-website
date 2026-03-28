// src/pages/AuthorDashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full corrected author dashboard
//  ✅ All previous fixes retained
//  ✅ NEW: Wallet tab — AuthorWallet component integrated
//  ✅ Wallet tab shows badge when available balance > 0
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import AuthorWallet from '@/components/AuthorWallet';
import {
  BookOpen, FileText, TrendingUp, Eye, Download,
  Star, CheckCircle, XCircle, Clock, Plus, Edit3, User, BarChart2,
  ShoppingBag, LogOut, Save, Camera, Search, RefreshCw,
  AlertCircle, ChevronDown, ChevronUp, AlertTriangle,
  CreditCard, ArrowRight, Award, Users, Activity,
  Flame, BookMarked, Rocket, Wallet,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_BIO    = 500;
const MAX_NAME   = 100;
const MAX_AVATAR = 5 * 1024 * 1024;

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped:    'bg-purple-50 text-purple-700 border-purple-200',
  delivered:  'bg-teal-50 text-teal-700 border-teal-200',
  completed:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending:  'text-amber-600',
  paid:     'text-green-600',
  failed:   'text-red-600',
  refunded: 'text-gray-500',
};

const CONTENT_STATUS_COLORS: Record<string, string> = {
  published:      'bg-green-50 text-green-700 border-green-200',
  draft:          'bg-gray-100 text-gray-600 border-gray-200',
  archived:       'bg-red-50 text-red-600 border-red-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  discontinued:   'bg-gray-200 text-gray-500 border-gray-300',
};

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title:        string;
  description:  string;
  confirmLabel?: string;
  destructive?:  boolean;
  onConfirm:    () => void;
  onCancel?:    () => void;
}

const ConfirmDialog = ({
  title, description, confirmLabel = 'Confirm', destructive = false, onConfirm, onCancel,
}: ConfirmOptions & { onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <Card className="p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-start gap-3 mb-4">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${destructive ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle className={`h-5 w-5 ${destructive ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <div>
          <h3 className="font-semibold text-base text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} size="sm">Cancel</Button>
        <Button size="sm" className={destructive ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          onClick={() => { onConfirm(); onCancel(); }}>
          {confirmLabel}
        </Button>
      </div>
    </Card>
  </div>
);

function useConfirm() {
  const [dialog, setDialog] = useState<(ConfirmOptions & { onCancel: () => void }) | null>(null);
  const confirm = useCallback((opts: ConfirmOptions) => {
    setDialog({
      ...opts,
      onCancel:  () => { setDialog(null); opts.onCancel?.(); },
      onConfirm: () => { setDialog(null); opts.onConfirm(); },
    });
  }, []);
  const DialogNode = dialog ? <ConfirmDialog {...dialog} /> : null;
  return { confirm, DialogNode };
}

// ── Tiny stat cell for the Performance tab ────────────────────────────────────

const StatMini = ({ label, value, icon: Icon, color, bg }: {
  label: string; value: string | number; icon: any; color: string; bg: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-background border">
    <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <div className="min-w-0">
      <div className="text-lg font-bold text-foreground leading-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground truncate">{label}</div>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuthorDashboard() {
  const { userId, role } = useRole();
  const navigate         = useNavigate();
  const { toast }        = useToast();
  const fileRef          = useRef<HTMLInputElement>(null);
  const { confirm, DialogNode } = useConfirm();

  // ── profile ──────────────────────────────────────────────────────────────
  const [profile,       setProfile]       = useState<any>(null);
  const [loading,       setLoading]       = useState(true);
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

  // ── wallet balance peek (for tab badge) ──────────────────────────────────
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // ── submissions ───────────────────────────────────────────────────────────
  const [submissions,     setSubmissions]     = useState<any[]>([]);
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [subsLoading,     setSubsLoading]     = useState(false);

  // ── works ─────────────────────────────────────────────────────────────────
  const [works,             setWorks]             = useState<any[]>([]);
  const [worksLoading,      setWorksLoading]      = useState(false);
  const [worksSearch,       setWorksSearch]       = useState('');
  const [worksStatusFilter, setWorksStatusFilter] = useState('all');

  // ── orders ────────────────────────────────────────────────────────────────
  const [orders,        setOrders]        = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, any[]>>({});

  // ── derived stats ─────────────────────────────────────────────────────────
  const totalViews     = works.reduce((s, w) => s + (w.view_count      || 0), 0);
  const totalDownloads = works.reduce((s, w) => s + (w.total_downloads || 0), 0);
  const totalReviews   = works.reduce((s, w) => s + (w.total_reviews   || 0), 0);
  const ratedWorks     = works.filter(w => parseFloat(w.average_rating || '0') > 0);
  const avgRating      = ratedWorks.length > 0
    ? (ratedWorks.reduce((s, w) => s + parseFloat(w.average_rating), 0) / ratedWorks.length).toFixed(1)
    : '—';

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (userId) loadAll(); }, [userId]);

  // ── loaders ───────────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, subsRes, worksRes, walletRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),

        supabase
          .from('publications')
          .select('*')
          .eq('submitted_by', userId)
          .order('created_at', { ascending: false }),

        supabase
          .from('content')
          .select(
            'id, title, subtitle, author, publisher, content_type, format, status, ' +
            'visibility, access_level, cover_image_url, file_url, ' +
            'price, is_free, is_for_sale, is_featured, is_bestseller, is_new_arrival, ' +
            'average_rating, total_reviews, total_downloads, view_count, ' +
            'isbn, page_count, language, category_id, ' +
            'created_at, updated_at, published_at, uploaded_by'
          )
          .eq('uploaded_by', userId)
          .order('created_at', { ascending: false }),

        // Peek at wallet balance for tab badge
        supabase
          .from('author_wallets')
          .select('available_balance')
          .eq('author_id', userId)
          .maybeSingle(),
      ]);

      if (worksRes.error) throw worksRes.error;

      const p = profileRes.data;
      setProfile(p);
      setFullName(p?.full_name     || '');
      setBio(p?.bio                || '');
      setPhone(p?.phone            || '');
      setAddress(p?.address        || '');
      setOrganization(p?.organization || '');
      setDepartment(p?.department  || '');
      setAvatarUrl(p?.avatar_url   || '');
      setSubmissions(subsRes.data  || []);
      setWorks(worksRes.data       || []);

      if (walletRes.data) {
        setWalletBalance(parseFloat(walletRes.data.available_balance));
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: err.message });
    } finally {
      setLoading(false);
    }
    loadOrders();
  };

  const loadSubmissions = async () => {
    setSubsLoading(true);
    const { data, error } = await supabase
      .from('publications')
      .select('*')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false });
    if (error) toast({ variant: 'destructive', title: 'Failed to reload submissions', description: error.message });
    else setSubmissions(data || []);
    setSubsLoading(false);
  };

  const loadWorks = async () => {
    setWorksLoading(true);
    const { data, error } = await supabase
      .from('content')
      .select(
        'id, title, subtitle, author, publisher, content_type, format, status, ' +
        'visibility, access_level, cover_image_url, file_url, ' +
        'price, is_free, is_for_sale, is_featured, is_bestseller, is_new_arrival, ' +
        'average_rating, total_reviews, total_downloads, view_count, ' +
        'isbn, page_count, language, category_id, ' +
        'created_at, updated_at, published_at, uploaded_by'
      )
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false });
    if (error) toast({ variant: 'destructive', title: 'Failed to reload works', description: error.message });
    else setWorks(data || []);
    setWorksLoading(false);
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, order_number, status, payment_status, payment_method, payment_reference, ' +
        'total_price, sub_total, discount, tax, shipping, currency, ' +
        'shipping_address, billing_address, created_at, paid_at, completed_at, cancelled_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) toast({ variant: 'destructive', title: 'Failed to load orders', description: error.message });
    else setOrders(data || []);
    setOrdersLoading(false);
  };

  const loadOrderItems = async (orderId: string) => {
    if (orderItemsMap[orderId]) return;
    const { data } = await supabase
      .from('order_items')
      .select('*, content(id, title, cover_image_url, content_type, author)')
      .eq('order_id', orderId);
    if (data) setOrderItemsMap(prev => ({ ...prev, [orderId]: data }));
  };

  // ── profile actions ───────────────────────────────────────────────────────

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_AVATAR) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Image must be ≤ 5 MB' });
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
        full_name:    fullName.trim()     || undefined,
        bio:          bio.trim()          || undefined,
        phone:        phone.trim()        || undefined,
        address:      address.trim()      || undefined,
        organization: organization.trim() || undefined,
        department:   department.trim()   || undefined,
      };
      if (avatarBase64) payload.avatar_base64 = avatarBase64;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile-info-edit`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        }
      );
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

  const handleSignOut = () => {
    confirm({
      title:        'Sign Out',
      description:  'Are you sure you want to sign out?',
      confirmLabel: 'Sign Out',
      onConfirm:    async () => { await supabase.auth.signOut(); navigate('/auth'); },
    });
  };

  const goToCheckout = (order: any) => {
    const params = new URLSearchParams({ order_id: order.id });
    if (order.payment_method) params.set('method', order.payment_method);
    if (profile?.phone) {
      const digits = profile.phone.replace(/\D/g, '').slice(-9);
      if (digits.length >= 9) params.set('phone', digits);
    }
    navigate(`/checkout/payment/${order.id}?${params.toString()}`);
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const pendingCount     = submissions.filter(s => s.status === 'pending').length;
  const approvedCount    = submissions.filter(s => s.status === 'approved').length;
  const underReviewCount = submissions.filter(s => s.status === 'under_review').length;
  const rejectedCount    = submissions.filter(s => s.status === 'rejected').length;
  const publishedCount   = works.filter(w => w.status === 'published').length;
  const unpaidOrders     = orders.filter(o => o.payment_status !== 'paid' && o.status !== 'cancelled');

  const filteredSubmissions = subStatusFilter === 'all'
    ? submissions
    : submissions.filter(s => s.status === subStatusFilter);

  const filteredWorks = works.filter(w => {
    const matchesStatus = worksStatusFilter === 'all' || w.status === worksStatusFilter;
    const q = worksSearch.toLowerCase();
    const matchesSearch = !q ||
      (w.title        || '').toLowerCase().includes(q) ||
      (w.author       || '').toLowerCase().includes(q) ||
      (w.content_type || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const publishedWorks = works
    .filter(w => w.status === 'published')
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0));

  // ── loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Seo title="Author Dashboard | Intercen Books" description="Manage your manuscripts and published works." />
      <div className="min-h-screen bg-background">
        {DialogNode}
        <Header />

        {/* ── Hero ── */}
        <div className="bg-gradient-warm border-b">
          <div className="container max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {(avatarPreview || avatarUrl) ? (
                    <img src={avatarPreview || avatarUrl} alt=""
                      className="h-16 w-16 rounded-full object-cover border-2 border-primary/30 shadow-soft" />
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
                <Button variant="ghost" className="gap-2 text-muted-foreground text-xs h-8" onClick={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-8">

          {/* ── Unpaid orders banner ── */}
          {unpaidOrders.length > 0 && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <span className="font-medium text-orange-800 flex-1 text-sm">
                {unpaidOrders.length} order{unpaidOrders.length !== 1 ? 's' : ''} awaiting payment
              </span>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8"
                onClick={() => (document.querySelector('[value="orders"]') as HTMLElement)?.click()}>
                Complete Payment
              </Button>
            </div>
          )}

          {/* ── Pending submissions banner ── */}
          {pendingCount > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span className="font-medium text-amber-800 flex-1 text-sm">
                {pendingCount} manuscript{pendingCount !== 1 ? 's' : ''} awaiting editorial review
              </span>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => (document.querySelector('[value="submissions"]') as HTMLElement)?.click()}>
                View
              </Button>
            </div>
          )}

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Published Works', value: publishedCount,                 icon: BookOpen, color: 'text-primary',    bg: 'bg-accent'    },
              { label: 'Total Views',     value: totalViews.toLocaleString(),     icon: Eye,      color: 'text-green-600',  bg: 'bg-green-50'  },
              { label: 'Downloads',       value: totalDownloads.toLocaleString(), icon: Download, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Avg. Rating',     value: avgRating,                       icon: Star,     color: 'text-amber-600',  bg: 'bg-amber-50'  },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
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
                { value: 'overview',    label: 'Overview',                                                                icon: BarChart2   },
                { value: 'performance', label: 'Performance',                                                             icon: Activity    },
                { value: 'wallet',
                  label: walletBalance !== null && walletBalance > 0
                    ? `Wallet · KES ${walletBalance.toLocaleString()}`
                    : 'Wallet',
                  icon: Wallet },
                { value: 'submissions', label: `Submissions${submissions.length > 0 ? ` (${submissions.length})` : ''}`, icon: FileText    },
                { value: 'works',       label: `My Works${works.length > 0 ? ` (${works.length})` : ''}`,                icon: BookOpen    },
                { value: 'orders',      label: `Orders${orders.length > 0 ? ` (${orders.length})` : ''}`,                icon: ShoppingBag },
                { value: 'profile',     label: 'Edit Profile',                                                            icon: User        },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="gap-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                  <Icon className="h-4 w-4" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ══════════════════════════ OVERVIEW ══════════════════════════ */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 shadow-soft">
                  <h3 className="font-forum text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Submission Status
                  </h3>
                  <div className="space-y-3 mb-6">
                    {[
                      { label: 'Pending Review', count: pendingCount,     dot: 'bg-amber-400' },
                      { label: 'Approved',       count: approvedCount,    dot: 'bg-green-400' },
                      { label: 'Under Review',   count: underReviewCount, dot: 'bg-blue-400'  },
                      { label: 'Rejected',       count: rejectedCount,    dot: 'bg-red-400'   },
                    ].map(({ label, count, dot }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dot}`} />
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
                  {publishedWorks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm">No published works yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publishedWorks.slice(0, 5).map(work => (
                        <div key={work.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => navigate(`/content/${work.id}`)}>
                          {work.cover_image_url ? (
                            <img src={work.cover_image_url} alt="" className="h-10 w-7 object-cover rounded shadow-sm flex-shrink-0" />
                          ) : (
                            <div className="h-10 w-7 bg-accent rounded flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{work.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {(work.view_count || 0).toLocaleString()} views
                              {(work.total_downloads || 0) > 0 && ` · ${work.total_downloads.toLocaleString()} dl`}
                            </div>
                          </div>
                          {(work.average_rating || 0) > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 flex-shrink-0">
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

            {/* ══════════════════════ PERFORMANCE TAB ══════════════════════ */}
            <TabsContent value="performance">
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-forum text-xl">Content Performance</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Real-time analytics for all your works</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={loadWorks} disabled={worksLoading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${worksLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
                {works.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatMini label="Total Works"     value={works.length}                         icon={BookMarked} color="text-primary"    bg="bg-primary/10" />
                    <StatMini label="Published"       value={publishedCount}                       icon={Rocket}     color="text-green-600"  bg="bg-green-50"   />
                    <StatMini label="Total Views"     value={totalViews.toLocaleString()}           icon={Eye}        color="text-blue-600"   bg="bg-blue-50"    />
                    <StatMini label="Total Downloads" value={totalDownloads.toLocaleString()}       icon={Download}   color="text-purple-600" bg="bg-purple-50"  />
                    <StatMini label="Total Reviews"   value={totalReviews.toLocaleString()}         icon={Users}      color="text-teal-600"   bg="bg-teal-50"    />
                    <StatMini label="Avg Rating"      value={avgRating}                            icon={Star}       color="text-amber-600"  bg="bg-amber-50"   />
                  </div>
                )}
                {worksLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : works.length === 0 ? (
                  <Card className="p-12 text-center shadow-soft">
                    <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">No content yet.</p>
                    <Button onClick={() => navigate('/upload')} className="gap-2">
                      <Plus className="h-4 w-4" /> Upload Content
                    </Button>
                  </Card>
                ) : (
                  <Card className="shadow-soft overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
                            <th className="text-left px-4 py-3 font-medium">Title</th>
                            <th className="text-left px-4 py-3 font-medium">Type</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Views</th>
                            <th className="text-right px-4 py-3 font-medium">Downloads</th>
                            <th className="text-right px-4 py-3 font-medium">Reviews</th>
                            <th className="text-right px-4 py-3 font-medium">Rating</th>
                            <th className="text-right px-4 py-3 font-medium">Price</th>
                            <th className="text-left px-4 py-3 font-medium">Published</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {works.map(work => (
                            <tr key={work.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {work.cover_image_url ? (
                                    <img src={work.cover_image_url} alt="" className="h-8 w-6 object-cover rounded border flex-shrink-0" />
                                  ) : (
                                    <div className="h-8 w-6 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate max-w-[180px]">{work.title}</div>
                                    {work.author && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{work.author}</div>}
                                  </div>
                                  {work.is_featured   && <Flame className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" title="Featured"   />}
                                  {work.is_bestseller && <Award className="h-3.5 w-3.5 text-amber-500  flex-shrink-0" title="Bestseller" />}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs capitalize bg-muted px-2 py-0.5 rounded text-muted-foreground">{work.content_type}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CONTENT_STATUS_COLORS[work.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  {work.status?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">{(work.view_count || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">{(work.total_downloads || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-sm text-muted-foreground tabular-nums">{(work.total_reviews || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                {parseFloat(work.average_rating || '0') > 0 ? (
                                  <span className="flex items-center justify-end gap-1 text-amber-600 text-sm font-medium">
                                    <Star className="h-3 w-3 fill-amber-400" />
                                    {parseFloat(work.average_rating).toFixed(1)}
                                  </span>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                {work.is_free ? <span className="text-green-600 text-xs">Free</span> : `KES ${parseFloat(work.price || '0').toLocaleString()}`}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {work.published_at ? new Date(work.published_at).toLocaleDateString() : <span className="italic opacity-60">{work.status === 'draft' ? 'Draft' : 'Not published'}</span>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-0.5">
                                  <button onClick={() => navigate(`/content/${work.id}`)}
                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"><Eye className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => navigate(`/content/update/${work.id}`)}
                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ═══════════════════════════ WALLET TAB ═══════════════════════ */}
            <TabsContent value="wallet">
              {userId && <AuthorWallet userId={userId} />}
            </TabsContent>

            {/* ══════════════════════ SUBMISSIONS TAB ═══════════════════════ */}
            <TabsContent value="submissions">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map(s => (
                      <button key={s} onClick={() => setSubStatusFilter(s)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                          subStatusFilter === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                        }`}>
                        {s === 'all' ? `All (${submissions.length})` : s.replace('_', ' ')}
                        {s === 'pending' && pendingCount > 0 && subStatusFilter !== 'pending' && (
                          <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={loadSubmissions} disabled={subsLoading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${subsLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>

                {subsLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <Card className="p-12 text-center shadow-soft">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">
                      {subStatusFilter === 'all' ? 'No manuscripts submitted yet.' : `No ${subStatusFilter.replace('_', ' ')} submissions.`}
                    </p>
                    {subStatusFilter === 'all' && (
                      <Button onClick={() => navigate('/publish/submit')} className="gap-2">
                        <Plus className="h-4 w-4" /> Submit Your First Manuscript
                      </Button>
                    )}
                  </Card>
                ) : filteredSubmissions.map(sub => (
                  <Card key={sub.id} className="p-6 shadow-soft">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex gap-4 flex-1 min-w-0">
                        {sub.cover_image_url && (
                          <img src={sub.cover_image_url} alt=""
                            className="h-20 w-14 object-cover rounded-lg border flex-shrink-0 shadow-sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <h3 className="font-forum text-lg">{sub.title}</h3>
                            {sub.subtitle && <span className="text-sm text-muted-foreground italic">{sub.subtitle}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                              sub.status === 'approved'     ? 'bg-green-50 text-green-700 border-green-200' :
                              sub.status === 'rejected'     ? 'bg-red-50 text-red-700 border-red-200' :
                              sub.status === 'under_review' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {sub.status === 'under_review' ? 'Under Review' : sub.status}
                            </span>
                          </div>
                          <p className="body-2 text-muted-foreground line-clamp-2 mb-2">{sub.description}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                            {sub.publishing_type && <span className="capitalize bg-muted px-2 py-0.5 rounded">{sub.publishing_type} publishing</span>}
                            {sub.language && <span className="bg-muted px-2 py-0.5 rounded">{sub.language}</span>}
                            {sub.pages    && <span className="bg-muted px-2 py-0.5 rounded">{sub.pages} pages</span>}
                            <span>Submitted {new Date(sub.created_at).toLocaleDateString()}</span>
                            {sub.reviewed_at && <span>Reviewed {new Date(sub.reviewed_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {sub.status === 'approved'     && <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Approved</span>}
                        {sub.status === 'under_review' && <span className="flex items-center gap-1 text-blue-600  text-sm font-medium"><Clock        className="h-4 w-4" /> In Review</span>}
                        {sub.status === 'rejected'     && <span className="flex items-center gap-1 text-red-600   text-sm font-medium"><XCircle       className="h-4 w-4" /> Rejected</span>}
                        {sub.manuscript_file_url && (
                          <a href={sub.manuscript_file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1 text-xs h-8 w-full">
                              <Eye className="h-3 w-3" /> View File
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                    {sub.admin_notes && (
                      <div className="mt-3 pt-3 border-t flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Editorial Notes</p>
                          <p className="text-xs text-muted-foreground italic">{sub.admin_notes}</p>
                        </div>
                      </div>
                    )}
                    {sub.rejection_feedback && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                        <span className="font-medium">Feedback: </span>{sub.rejection_feedback}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ══════════════════════════ WORKS TAB ═════════════════════════ */}
            <TabsContent value="works">
              <div className="space-y-4">
                <Card className="p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                      <div className="relative min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" placeholder="Search title, author…" value={worksSearch}
                          onChange={e => setWorksSearch(e.target.value)}
                          className="pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background w-full focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {['all', 'published', 'draft', 'archived', 'pending_review'].map(s => (
                          <button key={s} onClick={() => setWorksStatusFilter(s)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                              worksStatusFilter === s
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                            }`}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={loadWorks} disabled={worksLoading} className="gap-1 px-2.5">
                        <RefreshCw className={`h-4 w-4 ${worksLoading ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button size="sm" onClick={() => navigate('/upload')} className="gap-2">
                        <Plus className="h-4 w-4" /> Upload
                      </Button>
                    </div>
                  </div>
                  {!worksLoading && (
                    <p className="text-xs text-muted-foreground mt-3">Showing {filteredWorks.length} of {works.length} works</p>
                  )}
                </Card>

                {worksLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : filteredWorks.length === 0 ? (
                  <Card className="p-12 text-center shadow-soft">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">
                      {worksSearch || worksStatusFilter !== 'all' ? 'No works match your filters.' : 'No content uploaded yet.'}
                    </p>
                    {!worksSearch && worksStatusFilter === 'all' && (
                      <Button onClick={() => navigate('/upload')} className="gap-2"><Plus className="h-4 w-4" /> Upload Content</Button>
                    )}
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredWorks.map(work => (
                      <Card key={work.id} className="shadow-soft overflow-hidden hover:shadow-elevated transition-all duration-200 group">
                        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                          {work.cover_image_url ? (
                            <img src={work.cover_image_url} alt={work.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-muted gap-2">
                              <BookOpen className="h-10 w-10 text-primary/30" />
                              <span className="text-[10px] text-muted-foreground capitalize">{work.content_type}</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${CONTENT_STATUS_COLORS[work.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {work.status?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-black/72 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="flex gap-2">
                              <button onClick={() => navigate(`/content/${work.id}`)}
                                className="p-2 bg-white/15 hover:bg-white/30 rounded-lg text-white transition-colors"><Eye className="h-4 w-4" /></button>
                              <button onClick={() => navigate(`/content/update/${work.id}`)}
                                className="p-2 bg-white/15 hover:bg-white/30 rounded-lg text-white transition-colors"><Edit3 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-sm line-clamp-1">{work.title}</h4>
                          {work.author && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{work.author}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">{work.content_type}</span>
                            <span className="text-sm font-semibold">
                              {work.is_free ? <span className="text-green-600 text-xs font-medium">Free</span> : `KES ${parseFloat(work.price || '0').toLocaleString()}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{(work.view_count || 0).toLocaleString()}</span>
                            {(work.total_downloads || 0) > 0 && (
                              <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{work.total_downloads.toLocaleString()}</span>
                            )}
                            {parseFloat(work.average_rating || '0') > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-600">
                                <Star className="h-3 w-3 fill-amber-400" />{parseFloat(work.average_rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══════════════════════════ ORDERS TAB ════════════════════════ */}
            <TabsContent value="orders">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-forum text-xl">Purchase History</h2>
                  <Button size="sm" variant="outline" onClick={loadOrders} disabled={ordersLoading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
                {ordersLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <Card className="p-12 text-center shadow-soft">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-2">No orders yet.</p>
                    <button className="text-primary text-sm underline" onClick={() => navigate('/books')}>Browse books</button>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => {
                      const isExpanded = expandedOrder === order.id;
                      const isUnpaid   = order.payment_status !== 'paid' && order.status !== 'cancelled';
                      return (
                        <Card key={order.id} className={`shadow-soft overflow-hidden transition-all ${isUnpaid ? 'ring-2 ring-orange-200' : ''}`}>
                          {isUnpaid && (
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 px-5 py-3 flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                                  <CreditCard className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-orange-900 leading-tight">Payment Pending</p>
                                  <p className="text-xs text-orange-700/80">Complete your purchase to access your items</p>
                                </div>
                              </div>
                              <Button size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white gap-2 flex-shrink-0 shadow-sm font-semibold"
                                onClick={() => goToCheckout(order)}>
                                <CreditCard className="h-3.5 w-3.5" />
                                Pay KES {parseFloat(order.total_price || '0').toLocaleString()}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-mono font-semibold text-sm text-foreground">#{order.order_number}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{order.status}</span>
                                  <span className={`text-xs font-medium ${PAYMENT_STATUS_COLORS[order.payment_status] || 'text-muted-foreground'}`}>
                                    {order.payment_status === 'paid' && '✓ '}{order.payment_status}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {order.payment_method && <span className="ml-2 capitalize">· {order.payment_method}</span>}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-lg font-bold text-foreground">KES {parseFloat(order.total_price || '0').toLocaleString()}</div>
                                <div className="text-[10px] text-muted-foreground">{order.currency || 'KES'}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end mt-3 pt-3 border-t">
                              <button
                                onClick={() => { const next = isExpanded ? null : order.id; setExpandedOrder(next); if (next) loadOrderItems(order.id); }}
                                className="text-xs text-primary hover:underline flex items-center gap-1">
                                {isExpanded ? <><ChevronUp className="h-3 w-3" /> Hide items</> : <><ChevronDown className="h-3 w-3" /> View items</>}
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-4">
                              {!orderItemsMap[order.id] ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                  <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />Loading items…
                                </div>
                              ) : orderItemsMap[order.id].length === 0 ? (
                                <p className="text-xs text-muted-foreground">No items found.</p>
                              ) : (
                                <div className="space-y-2">
                                  {orderItemsMap[order.id].map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-3 bg-background rounded-lg p-2.5 border">
                                      {item.content?.cover_image_url ? (
                                        <img src={item.content.cover_image_url} alt="" className="h-10 w-8 object-cover rounded border flex-shrink-0" />
                                      ) : (
                                        <div className="h-10 w-8 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{item.title || item.content?.title || 'Unknown'}</div>
                                        <div className="text-xs text-muted-foreground capitalize">{item.content?.content_type || '—'}</div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="text-right">
                                          <div className="text-sm font-semibold">KES {parseFloat(item.total_price || '0').toLocaleString()}</div>
                                          <div className="text-xs text-muted-foreground">Qty {item.quantity} × {parseFloat(item.unit_price || '0').toLocaleString()}</div>
                                        </div>
                                        {order.payment_status === 'paid' && item.content?.id && (
                                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 flex-shrink-0"
                                            onClick={() => navigate(`/content/${item.content.id}`)}>
                                            <Eye className="h-3 w-3" /> Access
                                          </Button>
                                        )}
                                        {isUnpaid && (
                                          <Button size="sm" variant="outline"
                                            className="h-8 text-xs gap-1 flex-shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50"
                                            onClick={() => goToCheckout(order)}>
                                            <CreditCard className="h-3 w-3" /> Pay Now
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══════════════════════ EDIT PROFILE TAB ══════════════════════ */}
            <TabsContent value="profile">
              <div className="max-w-2xl space-y-6">
                <Card className="p-6 shadow-soft">
                  <h2 className="font-forum text-xl mb-6">Edit Profile</h2>
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-2 block">Profile Picture</label>
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
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Email</label>
                      <Input value={profile?.email || ''} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input value={fullName} onChange={e => setFullName(e.target.value)} maxLength={MAX_NAME} placeholder="Your name" disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7xx xxx xxx" disabled={saving} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Address</label>
                      <Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="P.O. Box …" disabled={saving} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Organization</label>
                        <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Publisher / Institution" disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Department</label>
                        <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Editorial" disabled={saving} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Role</label>
                      <Input value={role || ''} readOnly disabled className="bg-muted/50 cursor-not-allowed capitalize" />
                      <p className="text-xs text-muted-foreground">Role is assigned by admin.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Bio <span className="text-muted-foreground font-normal">({bio.length}/{MAX_BIO})</span></label>
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