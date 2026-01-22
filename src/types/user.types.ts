export type UserRole = 'reader' | 'author' | 'publisher' | 'admin' | 'corporate_user';
export type AccountType = 'personal' | 'corporate' | 'institutional';

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  bio?: string;
  organization?: string;
  department?: string;
  role: UserRole;
  account_type: AccountType;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}
