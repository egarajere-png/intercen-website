import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/SupabaseClient';
import { Loader2, Upload, FileText, Image as ImageIcon, History } from 'lucide-react';
import { ContentDeleteButton } from '@/components/contents/ContentDeleteButton';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB

const CONTENT_TYPES = [
  'book', 'ebook', 'document', 'paper', 'report', 'manual', 'guide'
] as const;

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'organization', label: 'Organization Only' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'public', label: 'Public' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'archived', label: 'Archived' },
];

interface VersionHistory {
  version_number: string;
  file_url: string;
  file_size_mb: number;
  format: string;
  change_summary: string;
  changed_by_name: string;
  changed_at: string;
}

export default function ContentUpdatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    author: '',
    publisher: '',
    description: '',
    price: '',
    isbn: '',
    language: 'en',
    visibility: 'private' as typeof VISIBILITY_OPTIONS[number]['value'],
    status: 'draft' as typeof STATUS_OPTIONS[number]['value'],
    contentType: '' as typeof CONTENT_TYPES[number],
    category_id: '',
    version: '1.0',
    page_count: '',
    file: null as File | null,
    cover: null as File | null,
    currentFileUrl: '',
    currentCoverUrl: '',
  });

  useEffect(() => {
    // Always scroll to top when this page mounts or id changes
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (id) {
      loadContent();
    }
  }, [id]);

  // Also scroll to top when loading changes from true to false (content loaded)
  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [loading]);

  const loadContent = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Content not found');
        navigate('/dashboard');
        return;
      }

      // Check if user has permission to edit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        navigate('/login');
        return;
      }

      setForm({
        title: data.title || '',
        subtitle: data.subtitle || '',
        author: data.author || '',
        publisher: data.publisher || '',
        description: data.description || '',
        price: data.price?.toString() || '',
        isbn: data.isbn || '',
        language: data.language || 'en',
        visibility: data.visibility || 'private',
        status: data.status || 'draft',
        contentType: data.content_type || '',
        category_id: data.category_id || '',
        version: data.version || '1.0',
        page_count: data.page_count?.toString() || '',
        file: null,
        cover: null,
        currentFileUrl: data.file_url || '',
        currentCoverUrl: data.cover_image_url || '',
      });

    } catch (err: any) {
      console.error('Load error:', err);
      toast.error(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_content_version_history', { p_content_id: id });

      if (error) throw error;

      setVersionHistory(data || []);
      setShowVersionHistory(true);
    } catch (err: any) {
      console.error('Version history error:', err);
      toast.error('Failed to load version history');
    }
  };
  const handlePublishClick = () => {
  navigate(`/content/publish/${id}`); // replace contentId with your actual id variable
};

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
      
      setForm(prev => ({ 
        ...prev, 
        [name === 'content_file' ? 'file' : 'cover']: file 
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

  const validate = () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!form.contentType) {
      toast.error('Content Type is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setUpdating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      // Build FormData
      const formData = new FormData();
      formData.append('content_id', id!);
      formData.append('title', form.title.trim());
      formData.append('subtitle', form.subtitle.trim());
      formData.append('author', form.author.trim());
      formData.append('publisher', form.publisher.trim());
      formData.append('description', form.description.trim());
      formData.append('content_type', form.contentType);
      formData.append('price', form.price || '0');
      formData.append('isbn', form.isbn.trim());
      formData.append('language', form.language);
      formData.append('visibility', form.visibility);
      formData.append('status', form.status);
      formData.append('version', form.version);
      
      if (form.category_id) formData.append('category_id', form.category_id);
      if (form.page_count) formData.append('page_count', form.page_count);
      if (form.file) formData.append('content_file', form.file);
      if (form.cover) formData.append('cover_image', form.cover);

      const supabaseUrl = supabase.supabaseUrl;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/content-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Update error:', result);
        throw new Error(result.error || 'Update failed');
      }

      toast.success('Content updated successfully!');
      console.log('Update success:', result);

      // Reload content to get updated data
      await loadContent();

      // Clear file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
      setForm(prev => ({ ...prev, file: null, cover: null }));

    } catch (err: any) {
      console.error('Update failed:', err);
      toast.error(err.message || 'Update failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-3xl py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="font-forum text-3xl md:text-4xl text-primary">
              Update Content
            </h1>
            <p className="text-muted-foreground mt-2">
              Modify metadata or replace files for your content
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center">
            <Button
              variant="outline"
              onClick={loadVersionHistory}
            >
              <History className="h-4 w-4 mr-2" />
              Version History
            </Button>
            <Button
              variant="outline"
              onClick={handlePublishClick}
            >
              <History className="h-4 w-4 mr-2" />
              Publish Now
            </Button>
            {id && (
              <ContentDeleteButton
                contentId={id}
                contentTitle={form.title || 'Untitled'}
                redirectOnDelete="/"
              />
            )}
          </div>
        </div>

        {/* Current File Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.currentFileUrl && (
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Content File</p>
                  <a 
                    href={form.currentFileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View current file
                  </a>
                </div>
                <Badge variant="outline">v{form.version}</Badge>
              </div>
            )}
            {form.currentCoverUrl && (
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Cover Image</p>
                  <a 
                    href={form.currentCoverUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View current cover
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version History Modal */}
        {showVersionHistory && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Version History</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersionHistory(false)}
              >
                Close
              </Button>
            </CardHeader>
            <CardContent>
              {versionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No version history available</p>
              ) : (
                <div className="space-y-3">
                  {versionHistory.map((version, idx) => (
                    <div key={idx} className="border-l-2 border-primary/30 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Version {version.version_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(version.changed_at).toLocaleDateString()} by {version.changed_by_name || 'Unknown'}
                          </p>
                        </div>
                        <Badge variant="secondary">{version.format}</Badge>
                      </div>
                      <p className="text-sm mt-1">{version.change_summary}</p>
                      <a 
                        href={version.file_url} 
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download ({version.file_size_mb}MB)
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Update Form */}
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
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                name="subtitle"
                value={form.subtitle}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contentType">Content Type <span className="text-red-500">*</span></Label>
              <Select
                value={form.contentType}
                onValueChange={(value) => handleSelectChange('contentType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
              />
            </div>

            <div>
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                name="publisher"
                value={form.publisher}
                onChange={handleChange}
                className="mt-1"
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
              />
            </div>

            <div>
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="page_count">Page Count</Label>
              <Input
                id="page_count"
                name="page_count"
                type="number"
                min="0"
                value={form.page_count}
                onChange={handleChange}
                className="mt-1"
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
                  {VISIBILITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="content_file">
                Replace Content File (Optional)
              </Label>
              <Input
                id="content_file"
                name="content_file"
                type="file"
                accept=".pdf,.epub,.docx,.mobi,.txt,.md"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Upload a new file to replace the current one. Max 100MB.
              </p>
            </div>

            <div>
              <Label htmlFor="cover_image">
                Replace Cover Image (Optional)
              </Label>
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
                Upload a new cover image. Max 10MB.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6">
            <Button
              type="submit"
              variant="hero"
              size="lg"
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Update Content
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={updating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}