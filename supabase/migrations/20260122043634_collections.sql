create table public.collections(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255)not null,
    description text,
    user_id uuid references profiles (id) on delete cascade,
    organization_id uuid references organizations(id) on delete cascade,
    visibility varchar(20) default 'private' check(visibility in ('private','public','organization')),
    is_default boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_collections_org ON collections(organization_id);

