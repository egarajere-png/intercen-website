create table public.carts(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(user_id)
);