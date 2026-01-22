create table public.tags(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(100) not null unique,
    slug varchar(100) not null unique,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);