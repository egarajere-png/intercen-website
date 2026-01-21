create table public.carts(
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id) on delete cascade,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(user_id)
);