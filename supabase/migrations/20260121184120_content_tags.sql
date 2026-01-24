-- Content tags (many-to-many)
CREATE TABLE public.content_tags (
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, tag_id)
);


INSERT INTO public.tags (name, slug, created_at, updated_at)
VALUES
    -- Main Genres
    ('Fiction', 'fiction', NOW(), NOW()),
    ('Non-Fiction', 'non-fiction', NOW(), NOW()),
    ('Fantasy', 'fantasy', NOW(), NOW()),
    ('Science Fiction', 'science-fiction', NOW(), NOW()),
    ('Romance', 'romance', NOW(), NOW()),
    ('Mystery', 'mystery', NOW(), NOW()),
    ('Thriller', 'thriller', NOW(), NOW()),
    ('Horror', 'horror', NOW(), NOW()),
    ('Historical Fiction', 'historical-fiction', NOW(), NOW()),
    ('Literary Fiction', 'literary-fiction', NOW(), NOW()),

    -- Popular Sub-genres & Tropes
    ('Young Adult', 'young-adult', NOW(), NOW()),
    ('New Adult', 'new-adult', NOW(), NOW()),
    ('Dystopian', 'dystopian', NOW(), NOW()),
    ('Urban Fantasy', 'urban-fantasy', NOW(), NOW()),
    ('Paranormal Romance', 'paranormal-romance', NOW(), NOW()),
    ('Contemporary Romance', 'contemporary-romance', NOW(), NOW()),
    ('Crime', 'crime', NOW(), NOW()),
    ('Detective', 'detective', NOW(), NOW()),
    ('Psychological Thriller', 'psychological-thriller', NOW(), NOW()),
    ('Suspense', 'suspense', NOW(), NOW()),

    -- Non-Fiction & Educational
    ('Self-Help', 'self-help', NOW(), NOW()),
    ('Personal Development', 'personal-development', NOW(), NOW()),
    ('Business', 'business', NOW(), NOW()),
    ('Entrepreneurship', 'entrepreneurship', NOW(), NOW()),
    ('Finance', 'finance', NOW(), NOW()),
    ('Biography', 'biography', NOW(), NOW()),
    ('Memoir', 'memoir', NOW(), NOW()),
    ('History', 'history', NOW(), NOW()),
    ('True Crime', 'true-crime', NOW(), NOW()),
    ('Science', 'science', NOW(), NOW()),
    ('Technology', 'technology', NOW(), NOW()),
    ('Programming', 'programming', NOW(), NOW()),
    ('Artificial Intelligence', 'artificial-intelligence', NOW(), NOW()),
    ('Psychology', 'psychology', NOW(), NOW()),

    -- Educational / Academic (especially relevant in Kenya)
    ('KCSE', 'kcse', NOW(), NOW()),
    ('Textbook', 'textbook', NOW(), NOW()),
    ('Study Guide', 'study-guide', NOW(), NOW()),
    ('Past Papers', 'past-papers', NOW(), NOW()),
    ('University Notes', 'university-notes', NOW(), NOW()),
    ('Research Paper', 'research-paper', NOW(), NOW()),
    ('Thesis', 'thesis', NOW(), NOW()),

    -- Other Common & Cross-cutting Tags
    ('African Literature', 'african-literature', NOW(), NOW()),
    ('Swahili', 'swahili', NOW(), NOW()),
    ('Motivational', 'motivational', NOW(), NOW()),
    ('Inspirational', 'inspirational', NOW(), NOW()),
    ('Spiritual', 'spiritual', NOW(), NOW()),
    ('Christian', 'christian', NOW(), NOW()),
    ('Health', 'health', NOW(), NOW()),
    ('Mental Health', 'mental-health', NOW(), NOW()),
    ('Productivity', 'productivity', NOW(), NOW()),
    ('Leadership', 'leadership', NOW(), NOW()),
    ('Poetry', 'poetry', NOW(), NOW()),
    ('Comics', 'comics', NOW(), NOW()),
    ('Graphic Novel', 'graphic-novel', NOW(), NOW()),
    ('Children', 'children', NOW(), NOW()),
    ('Kids', 'kids', NOW(), NOW()),
    ('LGBTQ+', 'lgbtq', NOW(), NOW()),
    ('Feminism', 'feminism', NOW(), NOW()),
    ('Climate Change', 'climate-change', NOW(), NOW()),
    ('Environment', 'environment', NOW(), NOW());

-- Optional: If you want to prevent duplicates in case of re-run
-- You can wrap it in ON CONFLICT DO NOTHING
-- Example:
-- INSERT INTO public.tags (name, slug, created_at, updated_at)
-- VALUES (...)
-- ON CONFLICT (slug) DO NOTHING;