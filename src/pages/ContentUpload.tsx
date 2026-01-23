import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// You may want to move this to a hooks/ directory for real use
const ACCEPTED_FORMATS = [
  'application/pdf',
  'application/epub+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function ContentUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    genre: '',
    price: '',
    contentType: '',
    file: null as File | null,
    cover: null as File | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    if (files) {
      setForm(f => ({ ...f, [name]: files[0] }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const validate = () => {
    if (!form.title || !form.contentType || !form.file) {
      toast.error('Title, Content Type, and File are required.');
      return false;
    }
    if (form.file && form.file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 100MB limit.');
      return false;
    }
    if (form.file && !ACCEPTED_FORMATS.includes(form.file.type)) {
      toast.error('Unsupported file format.');
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
      const data = new FormData();
      data.append('title', form.title);
      data.append('author', form.author);
      data.append('description', form.description);
      data.append('genre', form.genre);
      data.append('price', form.price);
      data.append('content_type', form.contentType);
      if (form.file) data.append('content_file', form.file);
      if (form.cover) data.append('cover_image', form.cover);

      const res = await fetch('/functions/v1/content-upload', {
        method: 'POST',
        body: data,
      });
      if (!res.ok) throw new Error('Upload failed');
      const result = await res.json();
      toast.success('Content uploaded successfully!');
      setForm({
        title: '', author: '', description: '', genre: '', price: '', contentType: '', file: null, cover: null
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <h1 className="font-forum text-3xl md:text-4xl mb-6 text-primary">Upload Content</h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input name="title" value={form.title} onChange={handleChange} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="author">Author</Label>
              <Input name="author" value={form.author} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Input name="genre" value={form.genre} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="price">Price (optional)</Label>
              <Input name="price" value={form.price} onChange={handleChange} type="number" min="0" step="0.01" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contentType">Content Type *</Label>
              <Input name="contentType" value={form.contentType} onChange={handleChange} required placeholder="e.g. book, manuscript, doc" className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea name="description" value={form.description} onChange={handleChange} rows={4} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="content_file">Content File *</Label>
              <Input name="file" type="file" accept=".pdf,.epub,.doc,.docx" onChange={handleChange} ref={fileInputRef} required className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">PDF, EPUB, DOC, DOCX. Max 100MB.</p>
            </div>
            <div>
              <Label htmlFor="cover_image">Cover Image</Label>
              <Input name="cover" type="file" accept="image/*" onChange={handleChange} ref={coverInputRef} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Optional. Will be resized to 800x1200px.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Button type="submit" variant="hero" size="lg" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Content'}
            </Button>
            {uploading && <span className="text-sm text-muted-foreground">Please wait...</span>}
          </div>
        </form>
      </div>
    </Layout>
  );
}
