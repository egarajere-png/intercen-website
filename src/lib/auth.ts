// Utility to check if user is authenticated
export function isAuthenticated(): boolean {
  // Check for Supabase session in localStorage
  const session = localStorage.getItem('session');
  if (!session) return false;
  try {
    const parsed = JSON.parse(session);
    // Supabase session has an access_token and user object
    return !!parsed?.access_token && !!parsed?.user;
  } catch {
    return false;
  }
}
