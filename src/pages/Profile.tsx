import React, { useEffect, useState, useRef } from 'react';
import { Seo } from '@/components/Seo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';

const MAX_NAME = 100;
const MAX_BIO = 500;
const MAX_PHONE = 20;
const MAX_AVATAR_MB = 5;
const MAX_AVATAR = MAX_AVATAR_MB * 1024 * 1024;

const ACCOUNT_TYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'institutional', label: 'Institutional' },
];
const ROLES = [
  { value: 'reader', label: 'Reader' },
  { value: 'author', label: 'Author' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'admin', label: 'Admin' },
  { value: 'corporate_user', label: 'Corporate User' },
];

const ProfilePage: React.FC = () => {
  // ── Auth / profile state ───────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Profile fields ─────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'corporate' | 'institutional'>('personal');
  const [role, setRole] = useState('reader');

  // ── Avatar state ───────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Uploaded content state ─────────────────────────────────────────────────
  const [userContents, setUserContents] = useState<any[]>([]);
  const [showContentList, setShowContentList] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  // ── Orders state ───────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Load profile on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          setError('Could not load your profile. Please sign in again.');
          setLoading(false);
          return;
        }
        setUser(session.user);

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError || !data) {
          setError('Could not load your profile details.');
          setLoading(false);
          return;
        }

        setProfile(data);
        setFullName(data.full_name || '');
        setBio(data.bio || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setOrganization(data.organization || '');
        setDepartment(data.department || '');
        setAccountType((data.account_type || 'personal') as any);
        setRole(data.role || 'reader');
        setAvatarUrl(data.avatar_url || '');
      } catch (err) {
        setError('Could not load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
    // eslint-disable-next-line
  }, []);

  // ── Fetch orders when modal opens ──────────────────────────────────────────
  useEffect(() => {
    if (showOrders && user?.id) {
      fetchUserOrders();
    }
    // eslint-disable-next-line
  }, [showOrders, user?.id]);

  // ── Cleanup avatar preview URL ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // ── Fetch user's uploaded content ──────────────────────────────────────────
  const fetchUserContents = async () => {
    if (!user?.id) return;
    setLoadingContent(true);
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserContents(data || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load content',
        description: err.message || 'Could not load your uploaded content.',
      });
    } finally {
      setLoadingContent(false);
    }
  };

  // ── Fetch user's orders ────────────────────────────────────────────────────
  const fetchUserOrders = async () => {
    if (!user?.id) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            content ( id, title )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load orders',
        description: err.message || 'Could not load your orders.',
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  // ── Avatar helpers ─────────────────────────────────────────────────────────
  const convertFileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_AVATAR) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: `Please select an image (PNG, JPEG, WebP, GIF) ≤ ${MAX_AVATAR_MB}MB`,
      });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      setSaving(true);
      const base64 = await convertFileToBase64(file);
      setAvatarBase64(base64);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to process image',
        description: 'Could not read the image file. Please try another one.',
      });
    } finally {
      setSaving(false);
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarBase64(null);
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Dirty check ────────────────────────────────────────────────────────────
  const hasChanges = () =>
    fullName !== (profile?.full_name || '') ||
    bio !== (profile?.bio || '') ||
    phone !== (profile?.phone || '') ||
    address !== (profile?.address || '') ||
    organization !== (profile?.organization || '') ||
    department !== (profile?.department || '') ||
    accountType !== (profile?.account_type || 'personal') ||
    avatarBase64 !== null;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasChanges()) {
      toast({
        title: 'No changes detected',
        description: 'Please update at least one field before saving.',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Session expired. Please sign in again.');
      }

      const payload: Record<string, any> = {
        full_name: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        organization: organization.trim() || undefined,
        department: department.trim() || undefined,
        account_type: accountType,
      };
      if (avatarBase64) payload.avatar_base64 = avatarBase64;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/profile-info-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'x-client-info': 'supabase-js-web',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
      }

      // Refresh profile from database
      const { data: fresh, error: freshError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (freshError) throw freshError;

      setProfile(fresh);
      setUser(session.user);
      setSuccess('Profile updated successfully.');
      setAvatarBase64(null);
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarUrl(fresh.avatar_url || '');

      toast({ title: 'Profile saved', description: 'Your profile has been updated.' });
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
      toast({
        variant: 'destructive',
        title: 'Failed to save profile',
        description: err.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Header />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="text-destructive font-semibold">{error}</div>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Seo
        title="My Profile | Intercen Books"
        description="Manage your Intercen Books account. Update your personal details, avatar, contact information and view your order history."
        canonical="https://www.intercenbooks.com/profile"
      />
      <Header />
      <div className="container py-12 max-w-2xl mx-auto">

        {/* Top action buttons */}
        <div className="mb-8 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/content-management')}
          >
            View Uploaded Content
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => setShowOrders(true)}
          >
            My Orders
          </Button>
        </div>

        <h1 className="headline-1 mb-6">My Profile</h1>

        <Card className="p-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email (read-only) */}
            <div className="space-y-1">
              <label htmlFor="email" className="font-semibold">Email</label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="fullName" className="font-semibold">Full Name</label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                maxLength={MAX_NAME}
                placeholder="Mwangi Kamau"
                disabled={saving}
              />
            </div>

            {/* Avatar */}
            <div className="space-y-1">
              <label className="font-semibold">Avatar</label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="h-16 w-16 rounded-full object-cover border" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover border" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                    No Image
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  onChange={handleAvatar}
                  disabled={saving}
                />
                {avatarPreview && (
                  <Button type="button" variant="outline" onClick={clearAvatar} disabled={saving}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label htmlFor="phone" className="font-semibold">Phone</label>
              <Input
                id="phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                maxLength={MAX_PHONE}
                placeholder="+254 712 345 678"
                disabled={saving}
              />
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label htmlFor="address" className="font-semibold">Address</label>
              <Textarea
                id="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={2}
                placeholder="P.O. Box 12345-00100, Nairobi, Kenya"
                disabled={saving}
              />
            </div>

            {/* Organization */}
            <div className="space-y-1">
              <label htmlFor="organization" className="font-semibold">Organization</label>
              <Input
                id="organization"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                placeholder="InterCEN"
                disabled={saving}
              />
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label htmlFor="department" className="font-semibold">Department</label>
              <Input
                id="department"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="Publishing"
                disabled={saving}
              />
            </div>

            {/* Account Type */}
            <div className="space-y-1">
              <label htmlFor="accountType" className="font-semibold">Account Type</label>
              <select
                id="accountType"
                value={accountType}
                onChange={e => setAccountType(e.target.value as any)}
                disabled={saving}
                className="w-full border rounded px-3 py-2 bg-background text-foreground"
              >
                {ACCOUNT_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Role (read-only) */}
            <div className="space-y-1">
              <label htmlFor="role" className="font-semibold">Role</label>
              <Input
                id="role"
                value={role}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label htmlFor="bio" className="font-semibold">Bio</label>
              <Textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={MAX_BIO}
                rows={4}
                placeholder="Passionate about technology, open source, and building with Supabase..."
                disabled={saving}
              />
              <span className="text-xs text-muted-foreground">{bio.length}/{MAX_BIO}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-4 items-center flex-wrap">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                Back
              </Button>
              {success && <span className="text-green-600 text-sm">{success}</span>}
              {error && <span className="text-destructive text-sm">{error}</span>}
            </div>

          </form>
        </Card>
      </div>

      {/* ── Orders Modal ───────────────────────────────────────────────────── */}
      {showOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-card rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-primary text-xl leading-none"
              onClick={() => setShowOrders(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-foreground">My Orders</h2>

            {loadingOrders ? (
              <div className="py-8 text-center text-muted-foreground">Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                You have not placed any orders yet.
              </div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {orders.map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex flex-wrap items-center justify-between mb-2">
                      <div className="font-semibold text-foreground">Order #{order.order_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm mb-2">
                      <div>Status: <span className="font-medium text-foreground">{order.status}</span></div>
                      <div>
                        Payment:{' '}
                        <span className={order.payment_status === 'paid' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {order.payment_status}
                        </span>
                      </div>
                      <div>Total: <span className="font-medium">Ksh {order.total_price}</span></div>
                    </div>
                    <div className="mt-2">
                      <div className="font-semibold mb-1">Items:</div>
                      <ul className="space-y-2">
                        {(order.order_items || []).map((item: any) => (
                          <li
                            key={item.id}
                            className="flex flex-col md:flex-row md:items-center md:gap-4 border-b last:border-b-0 pb-2 last:pb-0"
                          >
                            <span className="font-medium text-foreground">
                              {item.content?.title || 'Untitled Content'}
                            </span>
                            <span className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</span>
                            {order.payment_status === 'paid' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => item.content?.id && navigate(`/content/${item.content.id}`)}
                                className="ml-auto mt-2 md:mt-0"
                              >
                                Access Content
                              </Button>
                            ) : (
                              <span className="ml-auto mt-2 md:mt-0 text-xs text-muted-foreground">
                                Pay to access
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;