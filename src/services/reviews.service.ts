// supabase/lib/reviewFunctions.ts   (or wherever this file lives)

import { supabase } from '../lib/SupabaseClient';

export async function submitReview({
  content_id,
  rating,
  title,
  review_text,
}: {
  content_id: string;
  rating: number;
  title: string;
  review_text: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('reviews-submit', {
    body: { content_id, rating, title, review_text },
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
  });

  if (error) throw error;
  return data;
}

export async function getReviews({
  content_id,
  sort_by = 'recent',
  rating_filter,
  verified_only = false,
  page = 1,
  limit = 10,
}: {
  content_id: string;
  sort_by?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
  rating_filter?: number;
  verified_only?: boolean;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams({
    content_id,
    sort_by,
    page: page.toString(),
    limit: limit.toString(),
  });

  if (rating_filter !== undefined && rating_filter !== null) {
    params.append('rating_filter', rating_filter.toString());
  }

  if (verified_only) {
    params.append('verified_only', 'true');
  }

  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke(
    `reviews-get?${params.toString()}`,
    {
      method: 'GET',                           // ← This was the missing piece
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
    }
  );

  if (error) throw error;
  return data;
}

export async function voteHelpful(review_id: string) {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke('reviews-vote-helpful', {
    body: { review_id },
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
  });

  if (error) throw error;
  return data;
}

export async function reportReview({
  review_id,
  reason,
}: {
  review_id: string;
  reason: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reviews-report`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ review_id, reason }),
    }
  );

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.error ||
      data?.message ||
      data?.event_message ||
      'Failed to report review'
    );
    (error as any).response = data;
    throw error;
  }

  return data;
}