// supabase/functions/reviews-report/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportReviewRequest {
  review_id: string;
  reason: string;
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

    // Create Supabase client with service role
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
        JSON.stringify({ error: "Unauthorized - Please log in to report reviews", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: ReportReviewRequest = await req.json();
    const { review_id, reason } = body;

    // Validate required fields
    if (!review_id || !reason) {
      return new Response(
        JSON.stringify({ error: "review_id and reason are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate reason length
    if (reason.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Reason must be at least 10 characters long" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (reason.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Reason must not exceed 1000 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Check if review exists
    const { data: review, error: reviewError } = await supabaseAdmin
      .from("reviews")
      .select("id, content_id, user_id")
      .eq("id", review_id)
      .maybeSingle();

    if (reviewError) {
      console.error("Review fetch error:", reviewError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch review" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!review) {
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Prevent users from reporting their own reviews
    if (review.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot report your own review" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Check if user already reported this review
    const { data: existingReport, error: reportCheckError } =
      await supabaseAdmin
        .from("reported_content")
        .select("id")
        .eq("content_type", "review")
        .eq("content_id", review_id)
        .eq("reported_by", user.id)
        .maybeSingle();

    if (reportCheckError) {
      console.error("Report check error:", reportCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing report" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If user already reported, update the existing report
    if (existingReport) {
      const { error: updateError } = await supabaseAdmin
        .from("reported_content")
        .update({
          reason: reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReport.id);

      if (updateError) {
        console.error("Report update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update report" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Your report has been updated",
          is_new: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Create new report
    const { data: newReport, error: insertError } = await supabaseAdmin
      .from("reported_content")
      .insert({
        content_type: "review",
        content_id: review_id,
        reported_by: user.id,
        reason: reason.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Report insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit report" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Check total report count for this review
    const { data: allReports, error: countError } = await supabaseAdmin
      .from("reported_content")
      .select("id")
      .eq("content_type", "review")
      .eq("content_id", review_id)
      .in("status", ["pending", "reviewing"]);

    if (countError) {
      console.error("Report count error:", countError);
      // Don't fail the request, just log the error
    }

    const reportCount = allReports ? allReports.length : 0;
    let autoHidden = false;

    // Step 6: Auto-hide review if it has 5+ reports (trigger handles this)
    // The database trigger will automatically hide the review
    // We just check the count to inform the user
    if (reportCount >= 5) {
      autoHidden = true;
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: autoHidden
          ? "Report submitted. This review has been automatically hidden pending moderation."
          : "Report submitted successfully. Our moderation team will review it shortly.",
        is_new: true,
        report_id: newReport.id,
        total_reports: reportCount,
        auto_hidden: autoHidden,
      }),
      {
        status: 201,
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