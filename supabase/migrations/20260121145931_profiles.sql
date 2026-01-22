create table public.profiles(
  id UUID PRIMARY KEY references auth.users(id) on delete cascade,
  full_name varchar(255),
  avatar_url varchar(500),
  phone varchar(20),
  address text,
  bio text,
  organization varchar(255),
  department varchar(255),
  role varchar(50) default 'reader' check (role in ('reader', 'author', 'publisher','admin', 'corporate_user')),
  account_type varchar (20) default 'personal' check (account_type in('personal', 'corporate','institutional')),
  is_verified boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_account_type ON profiles(account_type);

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
