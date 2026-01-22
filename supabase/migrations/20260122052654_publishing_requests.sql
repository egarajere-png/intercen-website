create table public.publishing_requests(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    title varchar(500) not null,
    description text,
    genre varchar(100),
    manuscript_url varchar(500),
    sample_chapters_url varchar(500),
    author_name varchar(255),
    author_bio text,
    status varchar (50) default 'pending' check(status in('pending','under_review','approved','rejected','published')),
    reviewer_notes text,
    reviewed_by uuid references profiles(id) on delete set null,
    submitted_at timestamp with time zone default now(),
    reviewed_at timestamp with time zone,
    published_at timestamp with time zone
);


create index idx_publishing_requests_user on publishing_requests(user_id);
create index idx_publishing_requests_status on publishing_requests(status);