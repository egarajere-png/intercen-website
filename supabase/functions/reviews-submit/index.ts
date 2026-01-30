// supabase/functions/reviews-submit/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SubmitReviewRequest {
  content_id: string;
  rating: number;
  title?: string;
  review_text?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify the JWT token and get user
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: SubmitReviewRequest = await req.json();
    const { content_id, rating, title, review_text } = body;

    // Validate required fields
    if (!content_id || !rating) {
      return new Response(
        JSON.stringify({ error: "content_id and rating are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate rating range (1-5 stars)
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return new Response(
        JSON.stringify({ error: "Rating must be an integer between 1 and 5" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Check if user has purchased this content
    const { data: purchaseData, error: purchaseError } = await supabaseAdmin
      .from("order_items")
      .select(`
        id,
        orders!inner (
          id,
          user_id,
          payment_status
        )
      `)
      .eq("content_id", content_id)
      .eq("orders.user_id", user.id)
      .eq("orders.payment_status", "paid")
      .limit(1);

    if (purchaseError) {
      console.error("Purchase check error:", purchaseError);
      return new Response(
        JSON.stringify({ error: "Failed to verify purchase" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify purchase exists
    const hasPurchased = purchaseData && purchaseData.length > 0;

    if (!hasPurchased) {
      return new Response(
        JSON.stringify({
          error: "You must purchase this content before reviewing it",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Check if user already reviewed this content
    const { data: existingReview, error: reviewCheckError } =
      await supabaseAdmin
        .from("reviews")
        .select("id")
        .eq("content_id", content_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (reviewCheckError) {
      console.error("Review check error:", reviewCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing review" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;
    let isUpdate = false;

    // Step 3: Update existing review or create new one
    if (existingReview) {
      // Update existing review
      isUpdate = true;
      const { data: updatedReview, error: updateError } = await supabaseAdmin
        .from("reviews")
        .update({
          rating,
          title: title || null,
          review_text: review_text || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReview.id)
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (updateError) {
        console.error("Review update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update review" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      result = updatedReview;
    } else {
      // Create new review
      const { data: newReview, error: insertError } = await supabaseAdmin
        .from("reviews")
        .insert({
          content_id,
          user_id: user.id,
          rating,
          title: title || null,
          review_text: review_text || null,
          is_verified_purchase: true,
        })
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (insertError) {
        console.error("Review insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create review" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      result = newReview;
    }

    // Step 4: Get updated content rating stats
    const { data: contentStats } = await supabaseAdmin
      .from("content")
      .select("average_rating, total_reviews")
      .eq("id", content_id)
      .single();

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: isUpdate ? "Review updated successfully" : "Review submitted successfully",
        review: result,
        content_stats: contentStats,
      }),
      {
        status: isUpdate ? 200 : 201,
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