import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import {Layout} from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';

// Helper to get JWT from localStorage or context (adjust as needed)
function getToken() {
  return localStorage.getItem('sb-access-token') || '';
}

const MAX_BIO = 500;
const MAX_NAME = 100;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export default function ProfileSetup() {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file type', description: 'Please select an image file.' });
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        toast({ title: 'File too large', description: 'Max size is 5MB.' });
        return;
      }
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let avatar_base64 = null;
    if (avatar) {
      avatar_base64 = avatarPreview;
    }
    try {
      const res = await fetch('/profile-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          bio,
          avatar_base64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Profile update failed');
      }
      toast({ title: 'Profile updated!', description: 'Your profile has been set up.' });
      navigate('/'); // Redirect to home or dashboard
    } catch (err: any) {
      toast({ title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-center min-h-[70vh] bg-background">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Set Up Your Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                maxLength={MAX_NAME}
                required
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={MAX_BIO}
                placeholder="Tell us about yourself"
                rows={4}
              />
              <div className="text-xs text-muted-foreground text-right">{bio.length}/{MAX_BIO}</div>
            </div>
            <div>
              <Label htmlFor="avatar">Avatar</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                ref={fileInputRef}
              />
              {avatarPreview && (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="mt-2 w-20 h-20 rounded-full object-cover border"
                />
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
