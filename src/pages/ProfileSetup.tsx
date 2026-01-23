import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '../hooks/use-toast';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

const MAX_NAME = 100;
const MAX_BIO = 500;
const MAX_PHONE = 20;
const MAX_AVATAR_MB = 5;
const MAX_AVATAR = MAX_AVATAR_MB * 1024 * 1024;

export default function ProfileSetup() {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'corporate' | 'institutional'>('personal');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [email, setEmail] = useState('');           // ← will be auto-filled
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-fill email from authenticated user
  useEffect(() => {
    const loadUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
      } else {
        // Fallback / edge case — user not properly signed in
        toast({
          variant: 'destructive',
          title: 'Authentication issue',
          description: 'Could not load your email. Please sign in again.',
        });
      }
    };

    loadUserEmail();
  }, [toast]);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > MAX_AVATAR) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please select an image ≤ 5MB (PNG, JPEG, WebP, GIF)',
      });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasChanges = () =>
    fullName.trim() ||
    bio.trim() ||
    phone.trim() ||
    address.trim() ||
    organization.trim() ||
    department.trim() ||
    avatarFile !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges()) {
      toast({ title: 'No changes', description: 'Please update at least one field.' });
      return;
    }

    setLoading(true);

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
        account_type: accountType,
      };

      if (avatarPreview) {
        payload.avatar_base64 = avatarPreview;
      }

      const res = await fetch('/profile-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      toast({ title: 'Success', description: 'Your profile has been saved.' });
      navigate('/');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const isOrgVisible = accountType === 'corporate' || accountType === 'institutional';

  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-lg p-8 shadow-xl border">
          <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
            Complete Your Profile
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email – readonly, auto-filled */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-muted-foreground">
                This is the email you registered with and cannot be changed here.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={MAX_NAME}
                placeholder="Mwangi Kamau"
                disabled={loading}
              />
              <p className="text-xs text-right text-muted-foreground">
                {fullName.length} / {MAX_NAME}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(value: 'personal' | 'corporate' | 'institutional') =>
                  setAccountType(value)
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="institutional">Institutional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isOrgVisible && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization / Institution</Label>
                  <Input
                    id="organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Acme Corp / University of Nairobi"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department / Faculty</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Engineering / Research / Marketing"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 712 345 678"
                maxLength={MAX_PHONE}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="P.O. Box 12345-00100, Nairobi, Kenya"
                rows={2}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio / About You</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={MAX_BIO}
                placeholder="Passionate about technology, open source, and building with Supabase..."
                rows={4}
                disabled={loading}
              />
              <p className="text-xs text-right text-muted-foreground">
                {bio.length} / {MAX_BIO}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Profile Picture</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatar}
                ref={fileRef}
                disabled={loading}
              />
              {avatarPreview && (
                <div className="flex items-center gap-4 mt-2">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-20 w-20 rounded-full object-cover border shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAvatar}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !hasChanges()}
            >
              {loading ? 'Saving...' : 'Save Profile & Continue'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}