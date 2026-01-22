CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_id, user_id)
);

-- ============================================
-- INDEXES (REVIEWS)
-- ============================================

CREATE INDEX idx_reviews_content ON reviews(content_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

create or replace function update_content_rating()
returns trigger as $$
begin
    update content set
        average_rating = (select avg(rating) from reviews where content_id = new.content_id),
        total_reviews = (select count(*) from reviews where content_id = new.content_id)
    where id = new.content_id;
    return new;
end;
$$ language plpgsql;

create trigger update_rating_on_review
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    for each row execute function update_content_rating();