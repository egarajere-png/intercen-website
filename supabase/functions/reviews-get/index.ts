// supabase/functions/reviews-get/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"; // ← prefer newer version if possible

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  // ────────────────────────────────────────────────
  // CORS preflight
  // ────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ────────────────────────────────────────────────
  // Only allow GET
  // ────────────────────────────────────────────────
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use GET." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // ────────────────────────────────────────────────
    // Admin client – bypasses RLS for reads
    // ────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ────────────────────────────────────────────────
    // Parse query parameters
    // ────────────────────────────────────────────────
    const url = new URL(req.url);
    const content_id = url.searchParams.get("content_id");

    if (!content_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: content_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sort_by = (url.searchParams.get("sort_by") || "recent") as
      | "recent"
      | "helpful"
      | "rating_high"
      | "rating_low";
    const rating_filter = url.searchParams.has("rating_filter")
      ? Number(url.searchParams.get("rating_filter"))
      : null;
    const verified_only = url.searchParams.get("verified_only") === "true";
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "10");

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid pagination parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const offset = (page - 1) * limit;

    // ────────────────────────────────────────────────
    // Optional: Identify logged-in user (best effort)
    // ────────────────────────────────────────────────
    let currentUserId: string | null = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        currentUserId = user.id;
      }
    }

    // ────────────────────────────────────────────────
    // Main reviews query
    // ────────────────────────────────────────────────
    let query = supabaseAdmin
      .from("reviews")
      .select(
        `
          id, content_id, user_id, rating, title, content, helpful_count,
          is_verified_purchase, created_at, updated_at,
          profiles!reviews_user_id_fkey (full_name, avatar_url)
        `,
        { count: "exact" },
      )
      .eq("content_id", content_id);

    if (rating_filter && rating_filter >= 1 && rating_filter <= 5) {
      query = query.eq("rating", rating_filter);
    }

    if (verified_only) {
      query = query.eq("is_verified_purchase", true);
    }

    switch (sort_by) {
      case "helpful":
        query = query.order("helpful_count", { ascending: false, nullsFirst: false });
        break;
      case "rating_high":
        query = query.order("rating", { ascending: false });
        break;
      case "rating_low":
        query = query.order("rating", { ascending: true });
        break;
      default: // recent
        query = query.order("created_at", { ascending: false });
    }

    const { data: reviews, error: reviewsErr, count } = await query
      .range(offset, offset + limit - 1);

    if (reviewsErr) {
      console.error("Reviews query failed:", reviewsErr);
      return new Response(
        JSON.stringify({ error: "Could not load reviews", code: reviewsErr.code }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ────────────────────────────────────────────────
    // Rating distribution
    // ────────────────────────────────────────────────
    const { data: ratings } = await supabaseAdmin
      .from("reviews")
      .select("rating, is_verified_purchase")
      .eq("content_id", content_id);

    const distribution = [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count: ratings?.filter((row) => row.rating === r).length ?? 0,
    }));

    const totalReviews = ratings?.length ?? 0;
    const avgRating = totalReviews > 0
      ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const verifiedCount = ratings?.filter((r) => r.is_verified_purchase).length ?? 0;

    // ────────────────────────────────────────────────
    // User's own review (only if authenticated)
    // ────────────────────────────────────────────────
    let ownReview = null;

    if (currentUserId) {
      const { data: myReview } = await supabaseAdmin
        .from("reviews")
        .select(
          `
            id, content_id, user_id, rating, title, content, helpful_count,
            is_verified_purchase, created_at, updated_at,
            profiles!reviews_user_id_fkey (full_name, avatar_url)
          `,
        )
        .eq("content_id", content_id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      ownReview = myReview;
    }

    // ────────────────────────────────────────────────
    // Build response
    // ────────────────────────────────────────────────
    const totalPages = count ? Math.ceil(count / limit) : 0;

    return new Response(
      JSON.stringify({
        success: true,
        reviews: reviews ?? [],
        own_review: ownReview,
        pagination: {
          page,
          limit,
          total_reviews: count ?? 0,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_previous: page > 1,
        },
        stats: {
          average_rating: Number(avgRating.toFixed(2)),
          total_reviews: totalReviews,
          verified_count: verifiedCount,
          rating_distribution: distribution,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("reviews-get unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});