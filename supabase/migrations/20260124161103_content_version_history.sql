-- Migration: Content Version History and Search Vector Update
-- This supports the content-update Edge Function

-- ============================================
-- 1. Content Version History Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    format VARCHAR(50),
    change_summary TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure we can track version progression
    CONSTRAINT version_history_content_version_unique UNIQUE (content_id, version_number)
);

-- Index for efficient version lookups
CREATE INDEX IF NOT EXISTS idx_version_history_content 
    ON public.content_version_history(content_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_version_history_changed_by 
    ON public.content_version_history(changed_by);

-- ============================================
-- 2. Search Vector Update Function
-- ============================================
-- This function updates the search_vector column for full-text search
CREATE OR REPLACE FUNCTION public.update_content_search_vector(content_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.content
    SET search_vector = 
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(subtitle, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(author, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(publisher, '')), 'D') ||
        setweight(to_tsvector('english', array_to_string(COALESCE(meta_keywords, ARRAY[]::text[]), ' ')), 'B')
    WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Automatic Search Vector Update Trigger
-- ============================================
-- Automatically update search_vector on INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.trigger_update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.publisher, '')), 'D') ||
        setweight(to_tsvector('english', array_to_string(COALESCE(NEW.meta_keywords, ARRAY[]::text[]), ' ')), 'B');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_content_search_vector ON public.content;

CREATE TRIGGER trg_content_search_vector
    BEFORE INSERT OR UPDATE OF title, subtitle, description, author, publisher, meta_keywords
    ON public.content
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_content_search_vector();

-- ============================================
-- 4. Organization Members Table (if not exists)
-- ============================================
-- This table is used for permission checking in the Edge Function
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT organization_members_unique UNIQUE (organization_id, user_id),
    CONSTRAINT organization_members_role_check CHECK (
        role IN ('admin', 'moderator', 'member', 'viewer')
    )
);

CREATE INDEX IF NOT EXISTS idx_org_members_org 
    ON public.organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_members_user 
    ON public.organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_org_members_role 
    ON public.organization_members(organization_id, role);

-- ============================================
-- 5. Updated_at Trigger for Content Table
-- ============================================
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_updated_at ON public.content;

CREATE TRIGGER trg_content_updated_at
    BEFORE UPDATE ON public.content
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 6. Helper Function: Get Content Version History
-- ============================================
CREATE OR REPLACE FUNCTION public.get_content_version_history(p_content_id UUID)
RETURNS TABLE (
    version_number VARCHAR(20),
    file_url VARCHAR(500),
    file_size_mb NUMERIC(10,2),
    format VARCHAR(50),
    change_summary TEXT,
    changed_by_name VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vh.version_number,
        vh.file_url,
        ROUND(vh.file_size_bytes::NUMERIC / 1024 / 1024, 2) as file_size_mb,
        vh.format,
        vh.change_summary,
        p.full_name as changed_by_name,
        vh.created_at as changed_at
    FROM public.content_version_history vh
    LEFT JOIN public.profiles p ON vh.changed_by = p.id
    WHERE vh.content_id = p_content_id
    ORDER BY vh.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. RLS Policies (Security)
-- ============================================

-- Enable RLS on version history
ALTER TABLE public.content_version_history ENABLE ROW LEVEL SECURITY;

-- Users can view version history of content they uploaded
CREATE POLICY "Users can view their own content version history"
    ON public.content_version_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.content c
            WHERE c.id = content_version_history.content_id
            AND c.uploaded_by = auth.uid()
        )
    );

-- Users can view version history of public content
CREATE POLICY "Anyone can view public content version history"
    ON public.content_version_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.content c
            WHERE c.id = content_version_history.content_id
            AND c.visibility = 'public'
            AND c.status = 'published'
        )
    );

-- Organization members can view org content version history
CREATE POLICY "Org members can view org content version history"
    ON public.content_version_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.content c
            JOIN public.organization_members om ON c.organization_id = om.organization_id
            WHERE c.id = content_version_history.content_id
            AND om.user_id = auth.uid()
        )
    );

-- Only the Edge Function (service role) can insert version history
CREATE POLICY "Service role can insert version history"
    ON public.content_version_history
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.content_version_history IS 'Stores historical versions of content files when they are replaced';
COMMENT ON FUNCTION public.update_content_search_vector(UUID) IS 'Updates the full-text search vector for a specific content item';
COMMENT ON FUNCTION public.get_content_version_history(UUID) IS 'Retrieves formatted version history for a content item';