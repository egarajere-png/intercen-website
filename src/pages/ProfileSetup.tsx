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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

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
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null); // ← new state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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
        toast({
          variant: 'destructive',
          title: 'Authentication issue',
          description: 'Could not load your email. Please sign in again.',
        });
        navigate('/signin');
      }
    };

    loadUserEmail();
  }, [toast, navigate]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size > MAX_AVATAR) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please select an image (PNG, JPEG, WebP, GIF) ≤ 5MB',
      });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    try {
      setLoading(true); // optional: show spinner during conversion
      const base64 = await convertFileToBase64(file);
      setAvatarBase64(base64);
      setAvatarFile(file);

      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    } catch (err) {
      console.error('Base64 conversion failed', err);
      toast({
        variant: 'destructive',
        title: 'Failed to process image',
        description: 'Could not read the image file. Please try another one.',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarBase64(null);
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasChanges = () =>
    fullName.trim() !== '' ||
    bio.trim() !== '' ||
    phone.trim() !== '' ||
    address.trim() !== '' ||
    organization.trim() !== '' ||
    department.trim() !== '' ||
    avatarBase64 !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges()) {
      toast({
        title: 'No changes detected',
        description: 'Please update at least one field before saving.',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please sign in again.');
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

      if (avatarBase64) {
        payload.avatar_base64 = avatarBase64; // ← now correct data: URI
      }

      const { data, error } = await supabase.functions.invoke('profile-update', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Profile saved',
        description: 'Your profile has been successfully updated.',
      });

      setShowWelcome(true);
    } catch (err: any) {
      console.error('Profile update error:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to save profile',
        description: err.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const isOrgVisible = accountType === 'corporate' || accountType === 'institutional';

  const handleContinue = () => {
    setShowWelcome(false);
    navigate('/');
  };

  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-lg p-8 shadow-xl border">
          <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
            Complete Your Profile
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email – readonly */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Registered email — cannot be changed here.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={MAX_NAME}
                placeholder="Mwangi Kamau"
                disabled={loading}
              />
              <p
                className={`text-xs text-right ${
                  fullName.length > MAX_NAME - 15 ? 'text-red-500 font-medium' : 'text-muted-foreground'
                }`}
              >
                {fullName.length} / {MAX_NAME}
              </p>
            </div>

            {/* Account Type */}
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

            {/* Conditional Organization fields */}
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

            {/* Phone */}
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

            {/* Address */}
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

            {/* Bio */}
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
              <p
                className={`text-xs text-right ${
                  bio.length > MAX_BIO - 50 ? 'text-red-500 font-medium' : 'text-muted-foreground'
                }`}
              >
                {bio.length} / {MAX_BIO}
              </p>
            </div>

            {/* Avatar */}
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

            {/* Submit */}
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

      {/* Welcome Dialog */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome aboard, {fullName.trim() || 'friend'}! 🎉</DialogTitle>
            <DialogDescription className="pt-4 text-base">
              Your profile is now complete.<br />
              You're fully set up and ready to explore Intercen Books.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <p className="text-muted-foreground">
              Thank you for joining us in Nairobi!
            </p>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button onClick={handleContinue} size="lg">
              Continue to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}