create table public.tags(
    id uuid primary key default uuid_generate_v4(),
    name varchar(100) not null unique,
    slug varchar(100) not null unique,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);