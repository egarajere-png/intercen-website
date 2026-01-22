create table public.banners(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(255) not null,
    subtitle varchar(255),
    description text,
    image_url varchar(512),
    link_url varchar(500),
    button_text varchar(100),
    position varchar(50) default 'hero' check(position in('hero','sidebar','popup','footer')),
    is_active boolean default true,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    sort_order integer default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);