// Utility to check if user is authenticated using Supabase

import { supabase } from './SupabaseClient';

export async function isAuthenticated(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return false;
  return !!data.session && !!data.session.user;
}

// Reset password using Supabase token
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Exchange the token for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(token);
  if (exchangeError) throw new Error(exchangeError.message);
  // Now update the password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
