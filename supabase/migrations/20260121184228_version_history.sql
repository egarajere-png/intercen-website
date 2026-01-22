create table public.version_history(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id uuid references content(id) on delete cascade,
    version_number varchar(20) not null,
    changes text,
    file_url varchar(500),
    modified_by uuid references profiles(id) on delete set null,
    modified_at timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);