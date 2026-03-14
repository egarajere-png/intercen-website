-- ============================================================
-- Migration: Create Publications & Update Books Tables
-- ============================================================

-- 1. Create publications table
CREATE TABLE IF NOT EXISTS public.publications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  subtitle        TEXT,
  author_name     TEXT NOT NULL,
  author_email    TEXT NOT NULL,
  author_phone    TEXT,
  author_bio      TEXT,
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'English',
  pages           INTEGER,
  isbn            TEXT,
  manuscript_file_url  TEXT,
  cover_image_url      TEXT,
  publishing_type TEXT NOT NULL CHECK (publishing_type IN ('traditional', 'self')),
  keywords        TEXT[],
  target_audience TEXT,
  rights_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_feedback   TEXT,
  submitted_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create books table if it doesn't exist, then add missing columns
CREATE TABLE IF NOT EXISTS public.books (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  author         TEXT,
  description    TEXT,
  price          NUMERIC(10, 2),
  cover_image    TEXT,
  category_id    UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  publication_id UUID REFERENCES public.publications(id) ON DELETE SET NULL,
  file_url       TEXT,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any missing columns to books in case the table already existed
DO $$
BEGIN
  -- publication_id link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'publication_id'
  ) THEN
    ALTER TABLE public.books ADD COLUMN publication_id UUID REFERENCES public.publications(id) ON DELETE SET NULL;
  END IF;

  -- file_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.books ADD COLUMN file_url TEXT;
  END IF;

  -- published_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.books ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS publications_updated_at ON public.publications;
CREATE TRIGGER publications_updated_at
  BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS books_updated_at ON public.books;
CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. RLS Policies for publications
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

-- Authors can see their own submissions
CREATE POLICY "Authors view own submissions"
  ON public.publications FOR SELECT
  USING (submitted_by = auth.uid());

-- Authenticated users can insert (submit)
CREATE POLICY "Authenticated users can submit"
  ON public.publications FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND rights_confirmed = TRUE);

-- Admins can view all
CREATE POLICY "Admins view all publications"
  ON public.publications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update (approve / reject)
CREATE POLICY "Admins update publications"
  ON public.publications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Storage buckets (run once; ignored if already exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('manuscripts', 'manuscripts', FALSE, 52428800,
    ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('book-covers',  'book-covers',  TRUE,  5242880,
    ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users upload to their own folder
CREATE POLICY "Authors upload manuscripts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manuscripts' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Admins read manuscripts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'manuscripts' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Authors upload covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Public read book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- 6. Helpful view for admin dashboard
CREATE OR REPLACE VIEW public.publication_requests_view AS
SELECT
  p.id,
  p.title,
  p.subtitle,
  p.author_name,
  p.author_email,
  p.publishing_type,
  p.status,
  p.created_at,
  p.reviewed_at,
  p.rejection_feedback,
  c.name AS category_name,
  u.email AS submitted_by_email
FROM public.publications p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN auth.users u ON u.id = p.submitted_by;

GRANT SELECT ON public.publication_requests_view TO authenticated;