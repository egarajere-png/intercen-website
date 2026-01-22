CREATE TABLE public.reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, content_id)
);

CREATE INDEX idx_reading_user_content ON reading_progress(user_id, content_id);