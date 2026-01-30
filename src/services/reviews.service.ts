import { supabase } from '../lib/SupabaseClient';

export async function submitReview({ content_id, rating, title, review_text }) {
  // Get the current session to extract the access token
  const { data: { session } } = await supabase.auth.getSession();
  
  const { data, error } = await supabase.functions.invoke('reviews-submit', {
    body: { content_id, rating, title, review_text },
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
  if (error) throw error;
  return data;
}

export async function getReviews({ content_id, sort_by = 'recent', rating_filter, verified_only, page = 1, limit = 10 }) {
  const params = new URLSearchParams({
    content_id,
    sort_by,
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (rating_filter) params.append('rating_filter', rating_filter.toString());
  if (verified_only) params.append('verified_only', 'true');
  
  // Get session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  
  const { data, error } = await supabase.functions.invoke(`reviews-get?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
  if (error) throw error;
  return data;
}

export async function voteHelpful(review_id) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const { data, error } = await supabase.functions.invoke('reviews-vote-helpful', {
    body: { review_id },
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
  if (error) throw error;
  return data;
}

export async function reportReview({ review_id, reason }) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/functions/v1/reviews-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ review_id, reason }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    const error = new Error(data?.error || data?.event_message || 'Failed to report review');
    error.response = data;
    throw error;
  }
  return data;
}
