-- ============================================
-- Review Votes Table
-- ============================================
-- Tracks which users found which reviews helpful
-- Prevents duplicate votes and enables vote toggling

CREATE TABLE public.review_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one vote per user per review
    UNIQUE(review_id, user_id)
);

-- ============================================
-- INDEXES (REVIEW_VOTES)
-- ============================================

CREATE INDEX idx_review_votes_review ON review_votes(review_id);
CREATE INDEX idx_review_votes_user ON review_votes(user_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE review_votes IS 'Tracks helpful votes on reviews to prevent duplicate voting';
COMMENT ON COLUMN review_votes.review_id IS 'Reference to the review being voted on';
COMMENT ON COLUMN review_votes.user_id IS 'User who marked the review as helpful';