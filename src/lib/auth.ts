// Utility to check if user is authenticated using Supabase
import { supabase } from './SupabaseClient';

export async function isAuthenticated(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return false;
  return !!data.session && !!data.session.user;
}
