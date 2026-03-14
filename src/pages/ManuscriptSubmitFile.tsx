// src/pages/ManuscriptSubmitFile.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/SupabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  author_name:      z.string().min(2, 'Full name required'),
  author_email:     z.string().email('Valid email required'),
  author_phone:     z.string().optional(),
  author_bio:       z.string().min(30, 'At least 30 characters required'),
  title:            z.string().min(1, 'Book title required'),
  subtitle:         z.string().optional(),
  category_id:      z.string().min(1, 'Select a category'),
  language:         z.string().min(1, 'Language required'),
  pages:            z.coerce.number().int().positive().optional(),
  isbn:             z.string().optional(),
  description:      z.string().min(100, 'At least 100 characters required'),
  target_audience:  z.string().min(10, 'Target audience required'),
  publishing_type:  z.enum(['traditional', 'self'], { required_error: 'Select publishing type' }),
  keywords:         z.string().optional(),
  rights_confirmed: z.literal(true, { errorMap: () => ({ message: 'You must confirm publishing rights' }) }),
  terms_agreed:     z.literal(true, { errorMap: () => ({ message: 'You must agree to terms' }) }),
});

type FormData = z.infer<typeof schema>;

const ManuscriptSubmitForm = () => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const defaultType     = searchParams.get('type') as 'traditional' | 'self' | null;
  // NOTE: Auth guard is handled by <AuthGuard> in App.tsx — no redirect needed here
  const { userId }      = useRole();
  const { toast }       = useToast();

  const [categories,     setCategories]     = useState<{ id: string; name: string }[]>([]);
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverFile,      setCoverFile]      = useState<File | null>(null);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [submitted,      setSubmitted]      = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { language: 'English', publishing_type: defaultType ?? undefined },
  });

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name')
      .order('name')
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  const uploadFile = async (file: File, bucket: string, uid: string): Promise<string> => {
    const ext  = file.name.split('.').pop();
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (data: FormData) => {
    if (!userId) {
      toast({ title: 'Not signed in', description: 'Please sign in to submit.', variant: 'destructive' });
      navigate('/auth?redirect=/publish/submit');
      return;
    }
    setIsSubmitting(true);
    try {
      let manuscriptUrl: string | null = null;
      let coverUrl:      string | null = null;

      if (manuscriptFile) manuscriptUrl = await uploadFile(manuscriptFile, 'manuscripts', userId);
      if (coverFile)      coverUrl      = await uploadFile(coverFile, 'book-covers', userId);

      const keywords = data.keywords
        ? data.keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];

      const { error } = await supabase.from('publications').insert({
        title:               data.title,
        subtitle:            data.subtitle || null,
        author_name:         data.author_name,
        author_email:        data.author_email,
        author_phone:        data.author_phone || null,
        author_bio:          data.author_bio,
        category_id:         data.category_id,
        description:         data.description,
        language:            data.language,
        pages:               data.pages || null,
        isbn:                data.isbn || null,
        manuscript_file_url: manuscriptUrl,
        cover_image_url:     coverUrl,
        publishing_type:     data.publishing_type,
        keywords,
        target_audience:     data.target_audience,
        rights_confirmed:    data.rights_confirmed,
        status:              'pending',
        submitted_by:        userId,
      });

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: userId,
        type:    'submission_received',
        title:   'Manuscript Submitted',
        message: `Your manuscript "${data.title}" has been received. We'll review it within 4–6 weeks.`,
      });

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container py-24 max-w-xl mx-auto text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Submission Received!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you! Our editorial team will review your manuscript and get back to you within <strong>4–6 weeks</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/author/submissions')}>View My Submissions</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12 md:py-20">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-2">Get Published</p>
            <h1 className="text-3xl font-bold mb-2">Submit Your Manuscript</h1>
            <p className="text-muted-foreground">Fill in the details below and our team will be in touch.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 bg-card p-8 rounded-2xl shadow border">

            {/* Author Info */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold border-b pb-2 w-full">Author Information</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Full Name *</Label>
                  <Input {...register('author_name')} placeholder="Jane Muthoni" />
                  {errors.author_name && <p className="text-xs text-destructive">{errors.author_name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input type="email" {...register('author_email')} placeholder="jane@example.com" />
                  {errors.author_email && <p className="text-xs text-destructive">{errors.author_email.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input {...register('author_phone')} placeholder="+254 700 000 000" />
              </div>
              <div className="space-y-1">
                <Label>Author Biography *</Label>
                <Textarea {...register('author_bio')} rows={4} placeholder="Tell us about yourself and your writing background…" />
                {errors.author_bio && <p className="text-xs text-destructive">{errors.author_bio.message}</p>}
              </div>
            </fieldset>

            {/* Book Info */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold border-b pb-2 w-full">Book Information</legend>
              <div className="space-y-1">
                <Label>Book Title *</Label>
                <Input {...register('title')} placeholder="The Silent River" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Subtitle (optional)</Label>
                <Input {...register('subtitle')} placeholder="A Story of Hope and Resilience" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Category *</Label>
                  <Select onValueChange={v => setValue('category_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Language *</Label>
                  <Input {...register('language')} placeholder="English" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Pages</Label>
                  <Input type="number" min={1} {...register('pages')} placeholder="250" />
                </div>
                <div className="space-y-1">
                  <Label>ISBN (optional)</Label>
                  <Input {...register('isbn')} placeholder="978-3-16-148410-0" />
                </div>
              </div>
            </fieldset>

            {/* Manuscript Details */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold border-b pb-2 w-full">Manuscript Details</legend>
              <div className="space-y-1">
                <Label>Book Description *</Label>
                <Textarea {...register('description')} rows={5} placeholder="A compelling overview of your book…" />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Target Audience *</Label>
                <Input {...register('target_audience')} placeholder="Young adults aged 16–25…" />
                {errors.target_audience && <p className="text-xs text-destructive">{errors.target_audience.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Publishing Type *</Label>
                <Select defaultValue={defaultType ?? undefined} onValueChange={v => setValue('publishing_type', v as any)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditional">Traditional Publishing</SelectItem>
                    <SelectItem value="self">Self-Publishing Support</SelectItem>
                  </SelectContent>
                </Select>
                {errors.publishing_type && <p className="text-xs text-destructive">{errors.publishing_type.message}</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Upload Manuscript (PDF / DOCX)</Label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center">
                      {manuscriptFile ? manuscriptFile.name : 'Click to upload'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={e => setManuscriptFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  <Label>Upload Book Cover (optional)</Label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center">
                      {coverFile ? coverFile.name : 'JPG / PNG / WebP'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={e => setCoverFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Additional Info */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold border-b pb-2 w-full">Additional Information</legend>
              <div className="space-y-1">
                <Label>Keywords / Tags (comma-separated)</Label>
                <Input {...register('keywords')} placeholder="fiction, Kenya, coming-of-age" />
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="rights"
                    onCheckedChange={c => setValue('rights_confirmed', c === true ? true : undefined as any)}
                  />
                  <Label htmlFor="rights" className="text-sm leading-relaxed cursor-pointer">
                    I confirm I hold all necessary publishing rights to this manuscript and its contents.
                  </Label>
                </div>
                {errors.rights_confirmed && (
                  <p className="text-xs text-destructive">{errors.rights_confirmed.message}</p>
                )}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    onCheckedChange={c => setValue('terms_agreed', c === true ? true : undefined as any)}
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <a href="/terms" className="underline text-primary" target="_blank" rel="noreferrer">
                      Terms and Conditions
                    </a>{' '}
                    of Intercen Books.
                  </Label>
                </div>
                {errors.terms_agreed && (
                  <p className="text-xs text-destructive">{errors.terms_agreed.message}</p>
                )}
              </div>
            </fieldset>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting…</>
                : 'Submit Manuscript'
              }
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default ManuscriptSubmitForm;