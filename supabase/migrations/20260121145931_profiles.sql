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



-- supabase/migrations/20260123000002_add_email_to_profiles.sql

-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles(email);

-- Add last_login_at column (used by auth-login function)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add verification_token column (used by auth-verify-email function)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_verification_token ON public.profiles(verification_token);