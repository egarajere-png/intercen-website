// supabase/functions/reviews-get/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GetReviewsRequest {
  content_id: string;
  sort_by?: "recent" | "helpful" | "rating_high" | "rating_low";
  rating_filter?: 1 | 2 | 3 | 4 | 5;
  verified_only?: boolean;
  page?: number;
  limit?: number;
}

interface RatingDistribution {
  rating: number;
  count: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Parse query parameters from URL
    const url = new URL(req.url);
    const content_id = url.searchParams.get("content_id");
    const sort_by = (url.searchParams.get("sort_by") || "recent") as GetReviewsRequest["sort_by"];
    const rating_filter = url.searchParams.get("rating_filter")
      ? parseInt(url.searchParams.get("rating_filter")!)
      : null;
    const verified_only = url.searchParams.get("verified_only") === "true";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Validate required fields
    if (!content_id) {
      return new Response(
        JSON.stringify({ error: "content_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate page and limit
    if (page < 1 || limit < 1 || limit > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid page or limit parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Step 1: Build base query for reviews
    let query = supabaseClient
      .from("reviews")
      .select(
        `
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("content_id", content_id);

    // Apply rating filter if specified
    if (rating_filter && rating_filter >= 1 && rating_filter <= 5) {
      query = query.eq("rating", rating_filter);
    }

    // Apply verified purchase filter if specified
    if (verified_only) {
      query = query.eq("is_verified_purchase", true);
    }

    // Apply sorting
    switch (sort_by) {
      case "recent":
        query = query.order("created_at", { ascending: false });
        break;
      case "helpful":
        query = query.order("helpful_count", { ascending: false });
        break;
      case "rating_high":
        query = query.order("rating", { ascending: false });
        break;
      case "rating_low":
        query = query.order("rating", { ascending: true });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: reviews, error: reviewsError, count } = await query;

    if (reviewsError) {
      console.error("Reviews fetch error:", reviewsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch reviews" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Get rating distribution
    const { data: distributionData, error: distributionError } =
      await supabaseClient
        .from("reviews")
        .select("rating")
        .eq("content_id", content_id);

    if (distributionError) {
      console.error("Distribution fetch error:", distributionError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch rating distribution" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate distribution
    const distribution: RatingDistribution[] = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: distributionData.filter((r) => r.rating === rating).length,
    }));

    // Calculate total reviews and average rating
    const totalReviews = distributionData.length;
    const averageRating = totalReviews > 0
      ? distributionData.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    // Step 3: Get current user's review if authenticated
    let userReview = null;
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (user) {
      const { data: userReviewData } = await supabaseClient
        .from("reviews")
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `
        )
        .eq("content_id", content_id)
        .eq("user_id", user.id)
        .maybeSingle();

      userReview = userReviewData;
    }

    // Step 4: Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        reviews: reviews || [],
        user_review: userReview,
        pagination: {
          page,
          limit,
          total_reviews: count || 0,
          total_pages: totalPages,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
        },
        statistics: {
          average_rating: parseFloat(averageRating.toFixed(2)),
          total_reviews: totalReviews,
          distribution,
          verified_count: distributionData.filter(
            (r) => distributionData.find((rev) => rev.rating === r.rating)
          ).length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});