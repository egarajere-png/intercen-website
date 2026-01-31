import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { supabase } from '@/lib/SupabaseClient';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Image as ImageIcon, History } from 'lucide-react';
import { ContentDeleteButton } from '@/components/contents/ContentDeleteButton';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BACKPAGE_SIZE = 10 * 1024 * 1024; // 10MB

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

interface Category {
  id: string;
  name: string;
}

export default function ContentUpdatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backpageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    author: '',
    publisher: '',
    description: '',
    price: '',
    isbn: '',
    language: 'en',
    visibility: 'private' as (typeof VISIBILITY_OPTIONS)[number]['value'],
    status: 'draft' as (typeof STATUS_OPTIONS)[number]['value'],
    contentType: '' as (typeof CONTENT_TYPES)[number],
    category_id: '',
    version: '1.0',
    page_count: '',
    stock_quantity: '',
    is_featured: false,
    is_for_sale: false,
    tags: '',
    file: null as File | null,
    cover: null as File | null,
    backpage: null as File | null,
    currentFileUrl: '',
    currentCoverUrl: '',
    currentBackpageUrl: '',
  });

  // Check if ebook content type is selected
  const isEbookType = form.contentType === 'ebook';

  // ───────────────────────────────────────────────
  // Load data on mount
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    loadContent();
    loadCategories();
  }, [id]);

  useEffect(() => {
    if (!loading) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [loading]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      toast.error('Could not load categories');
    }
  };

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
        contentType: data.content_type || 'book',
        category_id: data.category_id || '',
        version: data.version || '1.0',
        page_count: data.page_count?.toString() || '',
        stock_quantity: data.stock_quantity?.toString() || '',
        is_featured: !!data.is_featured,
        is_for_sale: !!data.is_for_sale,
        tags: data.tags?.join(', ') || '',
        file: null,
        cover: null,
        backpage: null,
        currentFileUrl: data.file_url || '',
        currentCoverUrl: data.cover_image_url || '',
        currentBackpageUrl: data.backpage_image_url || '',
      });
    } catch (err: any) {
      console.error('Load content error:', err);
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

  // ───────────────────────────────────────────────
  // File change handler
  // ───────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (!files?.[0]) return;

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

    setForm((prev) => ({
      ...prev,
      [name === 'content_file' ? 'file' : name === 'cover_image' ? 'cover' : 'backpage']: file,
    }));
  };

  // ───────────────────────────────────────────────
  // Form change handlers (full update on submit)
  // ───────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  // ───────────────────────────────────────────────
  // Partial / auto-save logic (debounced)
  // ───────────────────────────────────────────────
  const partialUpdate = async (updates: Record<string, any>) => {
    try {
      // Force get fresh session (triggers refresh if needed)
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr) {
        console.error('getSession failed:', sessionErr);
        toast.error('Authentication error — please sign in again');
        return;
      }

      if (!session?.access_token) {
        console.error('No active session / token');
        toast.error('You appear to be logged out. Please sign in.');
        return;
      }

      console.log('Partial update → session user:', session.user?.id || 'unknown');
      console.log('Token prefix:', session.access_token.substring(0, 10) + '...');

      const payload = {
        content_id: id!,
        ...updates,
      };

      const { data, error } = await supabase.functions.invoke('content-part-update', {
        body: payload,
        // No need to set Authorization — SDK does it
      });

      if (error) {
        console.error('Invoke error:', error);
        throw error;
      }

      console.log('Partial update OK:', data);
    } catch (err: any) {
      console.error('Partial update crashed:', err);
      toast.error('Could not save change — check console');
    }
  };

  const debouncedPartialUpdate = debounce(partialUpdate, 800, { leading: false, trailing: true });

  const handlePartialTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (['stock_quantity', 'price', 'page_count'].includes(name)) {
      debouncedPartialUpdate({ [name]: value || '0' });
    }
  };

  const handlePartialSelect = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    debouncedPartialUpdate({ [name]: value });
  };

  const handlePartialCheckbox = (name: string, checked: boolean) => {
    setForm((prev) => ({ ...prev, [name]: checked }));
    debouncedPartialUpdate({ [name]: checked });
  };

  // ───────────────────────────────────────────────
  // Full form submit (including files)
  // ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.contentType) return toast.error('Content type is required');

    setUpdating(true);

    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        toast.error('You must be logged in');
        return;
      }

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
      formData.append('is_featured', form.is_featured.toString());
      formData.append('is_for_sale', form.is_for_sale.toString());

      if (form.category_id) formData.append('category_id', form.category_id);
      if (form.page_count) formData.append('page_count', form.page_count);
      if (form.stock_quantity) formData.append('stock_quantity', form.stock_quantity);

      if (form.tags.trim()) {
        const tagsArray = form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        formData.append('tags', JSON.stringify(tagsArray));
      }

      if (form.file) formData.append('content_file', form.file);
      if (form.cover) formData.append('cover_image', form.cover);
      if (form.backpage) formData.append('backpage_image', form.backpage);

      const { error } = await supabase.functions.invoke('content-update', {
        body: formData,
      });

      if (error) throw error;

      toast.success('Content updated successfully');

      // Reload fresh data
      await loadContent();

      // Clear file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
      if (backpageInputRef.current) backpageInputRef.current.value = '';
      setForm((prev) => ({ ...prev, file: null, cover: null, backpage: null }));
    } catch (err: any) {
      console.error('Full update failed:', err);
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Update Content</h1>
          <p className="text-muted-foreground">
            Modify metadata or replace files for your content
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button variant="outline" size="sm" onClick={loadVersionHistory}>
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/content/publish/${id}`)}>
            Publish Now
          </Button>
          {id && <ContentDeleteButton contentId={id} />}
        </div>

        {/* Current files card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Current Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.currentFileUrl && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Content File</p>
                    <a
                      href={form.currentFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View current file
                    </a>
                  </div>
                </div>
                <Badge variant="secondary">v{form.version}</Badge>
              </div>
            )}

            {form.currentCoverUrl && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Cover Image</p>
                    <a
                      href={form.currentCoverUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View current cover
                    </a>
                  </div>
                </div>
              </div>
            )}

            {form.currentBackpageUrl && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Backpage Image</p>
                    <a
                      href={form.currentBackpageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View current backpage
                    </a>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version history panel */}
        {showVersionHistory && (
          <Card className="mb-6 border-2 border-primary">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Version History</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowVersionHistory(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent>
              {versionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No version history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {versionHistory.map((v, i) => (
                    <div key={i} className="border rounded-lg p-4 hover:bg-accent/50 transition">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">Version {v.version_number}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(v.changed_at).toLocaleDateString()} by{' '}
                            {v.changed_by_name || 'Unknown'}
                          </p>
                        </div>
                        <Badge variant="outline">{v.format}</Badge>
                      </div>
                      <p className="text-sm mb-3">{v.change_summary}</p>
                      <a
                        href={v.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Download ({v.file_size_mb} MB)
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ───────────────────── Basic Information ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter content title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  name="subtitle"
                  value={form.subtitle}
                  onChange={handleChange}
                  placeholder="Enter subtitle (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contentType">
                    Content Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.contentType}
                    onValueChange={(v) => handleSelectChange('contentType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEbookType && (
                    <p className="text-xs text-amber-600 mt-2">
                      Note: Ebooks require content file, cover image, and backpage image when uploading
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => handleSelectChange('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    name="author"
                    value={form.author}
                    onChange={handleChange}
                    placeholder="Enter author name"
                  />
                </div>
                <div>
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    name="publisher"
                    value={form.publisher}
                    onChange={handleChange}
                    placeholder="Enter publisher name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ───────────────────── Category & Tags ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Category & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category_id">Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => handlePartialSelect('category_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="fiction, adventure, fantasy"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate tags with commas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ───────────────────── Sales & Inventory ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Sales & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={handlePartialTextChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={handlePartialTextChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_for_sale"
                    checked={form.is_for_sale}
                    onCheckedChange={(checked) =>
                      handlePartialCheckbox('is_for_sale', !!checked)
                    }
                  />
                  <Label
                    htmlFor="is_for_sale"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Available for sale
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_featured"
                    checked={form.is_featured}
                    onCheckedChange={(checked) =>
                      handlePartialCheckbox('is_featured', !!checked)
                    }
                  />
                  <Label
                    htmlFor="is_featured"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Feature this content
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ───────────────────── Additional Details ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    name="isbn"
                    value={form.isbn}
                    onChange={handleChange}
                    placeholder="Enter ISBN"
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
                    onChange={handlePartialTextChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={form.visibility}
                  onValueChange={(v) => handleSelectChange('visibility', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Provide a detailed description..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* ───────────────────── Files ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="content_file">Replace Content File (Optional)</Label>
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
                    Max 100MB. Supported: PDF, EPUB, DOCX, MOBI
                  </p>
                </div>

                <div>
                  <Label htmlFor="cover_image">Replace Cover Image (Optional)</Label>
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
                    Max 10MB. JPG, PNG, WebP
                  </p>
                </div>

                <div>
                  <Label htmlFor="backpage_image">Replace Backpage Image (Optional)</Label>
                  <Input
                    id="backpage_image"
                    name="backpage_image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    ref={backpageInputRef}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Max 10MB. JPG, PNG, WebP
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center gap-4 pt-6">
            <Button type="submit" variant="default" size="lg" disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
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