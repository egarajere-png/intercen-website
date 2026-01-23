import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/SupabaseClient';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024;  // 10MB

const CONTENT_TYPES = [
  'book',
  'ebook',
  'document',
  'paper',
  'report',
  'manual',
  'guide',
] as const;

export default function ContentUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    price: '',
    isbn: '',
    language: 'en',
    visibility: 'private' as 'public' | 'private' | 'organization' | 'restricted',
    status: 'draft' as 'draft' | 'pending_review' | 'published',
    contentType: '' as typeof CONTENT_TYPES[number],
    file: null as File | null,
    cover: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      if (name === 'content_file' && file.size > MAX_FILE_SIZE) {
        toast.error('Content file must be under 100MB');
        e.target.value = '';
        return;
      }
      if (name === 'cover_image' && file.size > MAX_COVER_SIZE) {
        toast.error('Cover image must be under 10MB');
        e.target.value = '';
        return;
      }
      setForm(prev => ({ ...prev, [name === 'content_file' ? 'file' : 'cover']: file }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!form.contentType) {
      toast.error('Content Type is required');
      return false;
    }
    if (!form.file) {
      toast.error('Content file is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setUploading(true);
    setProgress(0);

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to upload content');
        setUploading(false);
        return;
      }

      console.log('Session found, access token:', session.access_token.substring(0, 20) + '...');

      // Build FormData
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('author', form.author.trim());
      formData.append('description', form.description.trim());
      formData.append('content_type', form.contentType);
      formData.append('price', form.price || '0');
      formData.append('isbn', form.isbn.trim());
      formData.append('language', form.language);
      formData.append('visibility', form.visibility);
      formData.append('status', form.status);

      if (form.file) formData.append('content_file', form.file);
      if (form.cover) formData.append('cover_image', form.cover);

      // Get Supabase URL from the client
      const supabaseUrl = supabase.supabaseUrl;

      // Use fetch with explicit Authorization header (supabase.functions.invoke doesn't work well with FormData)
      const response = await fetch(`${supabaseUrl}functions/v1/content-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Note: Do NOT set Content-Type for FormData - browser will set it with boundary
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Upload error:', result);
        throw new Error(result.error || 'Upload failed');
      }

      toast.success('Content uploaded successfully!');
      console.log('Upload success:', result);

      // Reset form
      setForm({
        title: '',
        author: '',
        description: '',
        price: '',
        isbn: '',
        language: 'en',
        visibility: 'private',
        status: 'draft',
        contentType: '',
        file: null,
        cover: null,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';

    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Layout>
      <div className="container max-w-3xl py-12">
        <h1 className="font-forum text-3xl md:text-4xl mb-8 text-primary">
          Upload New Content
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="mt-1"
                placeholder="Enter title"
              />
            </div>

            <div>
              <Label htmlFor="contentType">Content Type <span className="text-red-500">*</span></Label>
              <Select
                value={form.contentType}
                onValueChange={(value) => handleSelectChange('contentType', value)}
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                name="author"
                value={form.author}
                onChange={handleChange}
                className="mt-1"
                placeholder="Author name"
              />
            </div>

            <div>
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                className="mt-1"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="isbn">ISBN (optional)</Label>
              <Input
                id="isbn"
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
                className="mt-1"
                placeholder="e.g. 978-3-16-148410-0"
              />
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(value) => handleSelectChange('visibility', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="organization">Organization Only</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              className="mt-1"
              placeholder="Describe your content..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="content_file">Content File <span className="text-red-500">*</span></Label>
              <Input
                id="content_file"
                name="content_file"
                type="file"
                accept=".pdf,.epub,.docx,.mobi"
                onChange={handleFileChange}
                ref={fileInputRef}
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supported: PDF, EPUB, DOCX, MOBI. Max 100MB.
              </p>
            </div>

            <div>
              <Label htmlFor="cover_image">Cover Image (optional)</Label>
              <Input
                id="cover_image"
                name="cover_image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                ref={coverInputRef}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG, WebP. Max 10MB. Will be resized automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6">
            <Button
              type="submit"
              variant="hero"
              size="lg"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Content'}
            </Button>
            {uploading && (
              <div className="text-sm text-muted-foreground">
                Please wait, processing your upload...
              </div>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}