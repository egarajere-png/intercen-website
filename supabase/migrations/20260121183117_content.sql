create table public.content(
    id uuid primary key default uuid_generate_v4(),
    title varchar(500) not null,
    subtitle varchar(500),
    description text,
    content_type varchar(50) not null check (content_type in ('book', 'ebook', 'document', 'paper','report', 'manual', 'guide')),
    format varchar(50) check (format in ('pdf','epub','mobi','docx','txt') ),
    author varchar(255),
    publisher varchar(255),
    published_date date,
    category_id uuid references public.categories(id) on delete set null,
    language varchar(10) default 'en',
    cover_image_url varchar(500),
    file_url varchar(500),
    file_size_bytes bigint, 
    page_count integer,
    price decimal(10,2) default 0.00,
    is_free boolean default false,
    if_for_sale boolean default false,
    stock_quantity integer default 0,
    isbn varchar(20) unique,
    -- Featured & Discovery
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Access Control
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'organization', 'restricted')),
    access_level VARCHAR(20) DEFAULT 'free' CHECK (access_level IN ('free', 'paid', 'subscription', 'organization_only')),
    
    -- Corporate/Document Features
    document_number VARCHAR(100), -- For corporate document tracking
    version VARCHAR(20) DEFAULT '1.0',
    department VARCHAR(100),
    confidentiality VARCHAR(50) CHECK (confidentiality IN ('public', 'internal', 'confidential', 'restricted')),
    
    -- Status & Ownership
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived', 'discontinued')),
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- SEO
    meta_keywords TEXT[],
    search_vector tsvector, -- For full-text search
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE

);