-- ============================================
-- Reported Content Table
-- ============================================
-- Tracks reports of inappropriate reviews for moderation
-- Supports auto-hiding after threshold and moderator workflow

CREATE TABLE public.reported_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('review', 'comment', 'content')),
    content_id UUID NOT NULL,
    reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate reports from same user for same content
    UNIQUE(content_type, content_id, reported_by)
);

-- ============================================
-- INDEXES (REPORTED_CONTENT)
-- ============================================

CREATE INDEX idx_reported_content_type ON reported_content(content_type, content_id);
CREATE INDEX idx_reported_content_status ON reported_content(status);
CREATE INDEX idx_reported_content_reported_by ON reported_content(reported_by);
CREATE INDEX idx_reported_content_created ON reported_content(created_at DESC);

-- ============================================
-- FUNCTION: Auto-hide review after 5 reports
-- ============================================

CREATE OR REPLACE FUNCTION check_review_reports()
RETURNS TRIGGER AS $$
DECLARE
    report_count INTEGER;
BEGIN
    -- Only process if this is a review report
    IF NEW.content_type = 'review' THEN
        -- Count total pending/reviewing reports for this review
        SELECT COUNT(*) INTO report_count
        FROM reported_content
        WHERE content_type = 'review'
          AND content_id = NEW.content_id
          AND status IN ('pending', 'reviewing');
        
        -- If 5 or more reports, auto-hide the review
        IF report_count >= 5 THEN
            UPDATE reviews
            SET is_verified_purchase = FALSE  -- Using this as a temporary hide flag
            WHERE id = NEW.content_id;
            
            -- Could also insert a notification for moderators here
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Check reports after insert
-- ============================================

CREATE TRIGGER check_reports_after_insert
    AFTER INSERT ON reported_content
    FOR EACH ROW
    EXECUTE FUNCTION check_review_reports();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE reported_content IS 'Tracks reported reviews and other content for moderation';
COMMENT ON COLUMN reported_content.content_type IS 'Type of content: review, comment, or content';
COMMENT ON COLUMN reported_content.content_id IS 'UUID of the reported item';
COMMENT ON COLUMN reported_content.reported_by IS 'User who submitted the report';
COMMENT ON COLUMN reported_content.reason IS 'Reason for reporting';
COMMENT ON COLUMN reported_content.status IS 'Current status: pending, reviewing, resolved, dismissed';
COMMENT ON COLUMN reported_content.moderator_id IS 'Moderator assigned to review the report';