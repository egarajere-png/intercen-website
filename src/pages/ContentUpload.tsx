import { useState, useRef, useEffect } from 'react';
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
const MAX_BACKPAGE_SIZE = 10 * 1024 * 1024;  // 10MB

const CONTENT_TYPES = [
  'book',
  'ebook',
  'document',
  'paper',
  'report',
  'manual',
  'guide',
  'manuscript',
  'article',
  'thesis',
  'dissertation',
] as const;

export default function ContentUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backpageInputRef = useRef<HTMLInputElement>(null);

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
    backpage: null as File | null,
  });

  // Check authentication and scroll to top
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast.error('Please log in to access this page');
          // Redirect to login page - adjust the path as needed
          window.location.href = '/login';
          return;
        }
        
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        toast.error('Authentication error. Please log in.');
        window.location.href = '/login';
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Force scroll to top on mount and when authentication is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      
      // Additional fallback to ensure scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 100);
    }
  }, [isAuthenticated]);

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
      if (name === 'backpage_image' && file.size > MAX_BACKPAGE_SIZE) {
        toast.error('Backpage image must be under 10MB');
        e.target.value = '';
        return;
      }
      setForm(prev => ({ 
        ...prev, 
        [name === 'content_file' ? 'file' : name === 'cover_image' ? 'cover' : 'backpage']: file 
      }));
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

  // Check if ebook content type is selected
  const isEbookType = form.contentType === 'ebook';

  const validate = () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!form.contentType) {
      toast.error('Content Type is required');
      return false;
    }
    
    // Additional validation for ebook content type
    if (isEbookType) {
      if (!form.file) {
        toast.error('Content file is required for ebooks');
        return false;
      }
      if (!form.cover) {
        toast.error('Cover image is required for ebooks');
        return false;
      }
      if (!form.backpage) {
        toast.error('Backpage image is required for ebooks');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setUploading(true);
    setProgress(0);

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to upload content');
        setUploading(false);
        window.location.href = '/login';
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
      if (form.backpage) formData.append('backpage_image', form.backpage);

      // Get Supabase URL from the client
      const supabaseUrl = 'https://nnljrawwhibazudjudht.supabase.co';

      // Use fetch with explicit Authorization header
      const response = await fetch(`${supabaseUrl}/functions/v1/content-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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
        contentType: '' as any,
        file: null,
        cover: null,
        backpage: null,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
      if (backpageInputRef.current) backpageInputRef.current.value = '';

      // Scroll back to top after successful upload
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <Layout>
        <div className="container max-w-3xl py-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying authentication...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Only render the form if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div id="top" className="container max-w-3xl py-12">
        <h1 className="font-forum text-3xl md:text-4xl mb-8 text-primary">
          Upload New Content
        </h1>

        <div className="space-y-8">
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
              <Label htmlFor="contentType">
                Content Type <span className="text-red-500">*</span>
              </Label>
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
              {isEbookType && (
                <p className="text-xs text-amber-600 mt-2">
                  Note: Ebooks require content file, cover image, and backpage image
                </p>
              )}
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
              <Label htmlFor="content_file">
                Content File {isEbookType && <span className="text-red-500">*</span>}
                {!isEbookType && <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                id="content_file"
                name="content_file"
                type="file"
                accept=".pdf,.epub,.docx,.mobi"
                onChange={handleFileChange}
                ref={fileInputRef}
                required={isEbookType}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supported: PDF, EPUB, DOCX, MOBI. Max 100MB.
              </p>
            </div>

            <div>
              <Label htmlFor="cover_image">
                Cover Image {isEbookType && <span className="text-red-500">*</span>}
                {!isEbookType && <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                id="cover_image"
                name="cover_image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                ref={coverInputRef}
                required={isEbookType}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG, WebP. Max 10MB. Will be resized automatically.
              </p>
            </div>

            <div>
              <Label htmlFor="backpage_image">
                Backpage Image {isEbookType && <span className="text-red-500">*</span>}
                {!isEbookType && <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                id="backpage_image"
                name="backpage_image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                ref={backpageInputRef}
                required={isEbookType}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG, WebP. Max 10MB. Back cover for your content.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6">
            <Button
              onClick={handleSubmit}
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
        </div>
      </div>
    </Layout>
  );
}