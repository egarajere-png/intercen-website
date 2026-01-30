// supabase/functions/reviews-vote-helpful/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VoteHelpfulRequest {
  review_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // ────────────────────────────────────────────────
    //  Authentication
    // ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized", 
          details: authError?.message || "Invalid or expired token" 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ────────────────────────────────────────────────
    //  Parse & validate body
    // ────────────────────────────────────────────────
    const body: VoteHelpfulRequest = await req.json();
    const { review_id } = body;

    if (!review_id) {
      return new Response(
        JSON.stringify({ error: "review_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ────────────────────────────────────────────────
    //  Fetch review + prevent self-vote
    // ────────────────────────────────────────────────
    const { data: review, error: reviewError } = await supabaseAdmin
      .from("reviews")
      .select("id, user_id, helpful_count")
      .eq("id", review_id)
      .maybeSingle();

    if (reviewError) {
      console.error("Review fetch error:", reviewError);
      return new Response(
        JSON.stringify({ error: "Failed to verify review" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!review) {
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (review.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot vote on your own review" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ────────────────────────────────────────────────
    //  Check existing vote
    // ────────────────────────────────────────────────
    const { data: existingVote, error: voteCheckError } = await supabaseAdmin
      .from("review_votes")
      .select("id")
      .eq("review_id", review_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (voteCheckError) {
      console.error("Vote check error:", voteCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to check vote status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let action: "voted" | "unvoted";
    let newHelpfulCount: number;

    if (existingVote) {
      // ── Toggle OFF ──
      action = "unvoted";

      const { error: deleteError } = await supabaseAdmin
        .from("review_votes")
        .delete()
        .eq("id", existingVote.id);

      if (deleteError) {
        console.error("Vote delete error:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to remove vote" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("reviews")
        .update({ helpful_count: Math.max(0, review.helpful_count - 1) })
        .eq("id", review_id)
        .select("helpful_count")
        .single();

      if (updateError || !updated) {
        console.error("Decrement count error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update helpful count" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newHelpfulCount = updated.helpful_count;
    } else {
      // ── Toggle ON ──
      action = "voted";

      const { error: insertError } = await supabaseAdmin
        .from("review_votes")
        .insert({
          review_id,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Vote insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to record vote" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("reviews")
        .update({ helpful_count: review.helpful_count + 1 })
        .eq("id", review_id)
        .select("helpful_count")
        .single();

      if (updateError || !updated) {
        console.error("Increment count error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update helpful count" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newHelpfulCount = updated.helpful_count;
    }

    // ────────────────────────────────────────────────
    //  Success response
    // ────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        action,
        message: action === "voted"
          ? "Review marked as helpful"
          : "Helpful vote removed",
        helpful_count: newHelpfulCount,
        is_voted: action === "voted",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});