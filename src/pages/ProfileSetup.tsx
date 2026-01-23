import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '../hooks/use-toast'; // adjust path as needed
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';

// Initialize Supabase client (ideally move to a context/provider in a real app)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

const MAX_NAME = 100;
const MAX_BIO = 500;
const MAX_AVATAR_SIZE_MB = 5;
const MAX_AVATAR_SIZE = MAX_AVATAR_SIZE_MB * 1024 * 1024;

export default function ProfileSetup() {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please select an image file (PNG, JPEG, WebP, GIF).',
      });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `Maximum size is ${MAX_AVATAR_SIZE_MB}MB.`,
      });
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasChanges = () =>
    fullName.trim() !== '' || bio.trim() !== '' || avatarFile !== null;

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('You must be signed in to update your profile.');
      }

      const payload: Record<string, any> = {};

      if (fullName.trim()) {
        payload.full_name = fullName.trim();
      }
      if (bio.trim()) {
        payload.bio = bio.trim();
      }
      if (avatarPreview) {
        payload.avatar_base64 = avatarPreview; // data:image/...;base64,...
      }
      // If avatar was removed → we simply don't send avatar_base64 → server won't touch it

      const response = await fetch('/profile-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast({
        title: 'Success!',
        description: 'Your profile has been updated.',
      });

      navigate('/'); // or '/dashboard' / '/profile' — your choice
    } catch (err: any) {
      const message = err.message || 'Something went wrong. Please try again.';

      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          message.includes('No fields to update') ||
          message.includes('No changes')
            ? 'Please make at least one change.'
            : message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <h2 className="mb-6 text-center text-2xl font-bold">
            Complete Your Profile
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={MAX_NAME}
                placeholder="John Mwangi"
                required
                disabled={loading}
              />
              <div className="text-right text-xs text-muted-foreground">
                {fullName.length}/{MAX_NAME}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={MAX_BIO}
                placeholder="Tell others a bit about yourself..."
                rows={4}
                disabled={loading}
              />
              <div className="text-right text-xs text-muted-foreground">
                {bio.length}/{MAX_BIO}
              </div>
            </div>

            {/* Avatar */}
            <div className="space-y-3">
              <Label htmlFor="avatar">Profile Picture</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarChange}
                ref={fileInputRef}
                disabled={loading}
              />

              {avatarPreview && (
                <div className="flex items-center gap-4">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-20 w-20 rounded-full border object-cover shadow-sm"
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
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}