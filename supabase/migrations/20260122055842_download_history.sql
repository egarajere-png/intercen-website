CREATE TABLE public.download_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_downloads_content ON download_history(content_id);
CREATE INDEX idx_downloads_user ON download_history(user_id);
CREATE INDEX idx_downloads_date ON download_history(downloaded_at);