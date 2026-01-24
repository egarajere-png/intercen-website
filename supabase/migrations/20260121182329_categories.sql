create table public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    icon_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Step 1: Insert main categories first
INSERT INTO public.categories (name, slug, description, icon_url, sort_order)
VALUES
    ('Fiction',                'fiction',                'Literary works based on imagination',                'https://example.com/icons/fiction.svg',       10),
    ('Non-Fiction',            'non-fiction',            'Factual and informative books',                      'https://example.com/icons/non-fiction.svg',   20),
    ('Academic & Education',   'academic',               'Textbooks, study materials, research',               'https://example.com/icons/academic.svg',      30),
    ('Business & Economics',   'business',               'Entrepreneurship, finance, marketing',               'https://example.com/icons/business.svg',      40),
    ('Technology & Programming','technology',            'Programming, software, hardware, AI',               'https://example.com/icons/technology.svg',    60);

-- Step 2: Insert sub-categories using slugs to reference parents
INSERT INTO public.categories (name, slug, description, parent_id, sort_order)
SELECT 
    'Fantasy', 'fantasy', 'Magic, mythical worlds, epic quests',
    (SELECT id FROM categories WHERE slug = 'fiction'),
    11
UNION ALL
SELECT 
    'Science Fiction', 'science-fiction', 'Space, future tech, dystopias',
    (SELECT id FROM categories WHERE slug = 'fiction'),
    12
UNION ALL
SELECT 
    'Mystery / Thriller', 'mystery-thriller', 'Crime, suspense, psychological thrillers',
    (SELECT id FROM categories WHERE slug = 'fiction'),
    13
UNION ALL
SELECT 
    'Computer Science', 'computer-science', 'Programming, algorithms, AI, data science',
    (SELECT id FROM categories WHERE slug = 'academic'),
    31
UNION ALL
SELECT 
    'Engineering', 'engineering', 'Civil, mechanical, electrical, software engineering',
    (SELECT id FROM categories WHERE slug = 'academic'),
    32;