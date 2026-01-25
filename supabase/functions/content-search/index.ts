// supabase/functions/content-search/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchFilters {
  category_id?: string;
  content_type?: string;
  price_min?: number;
  price_max?: number;
  min_rating?: number;
  is_free?: boolean;
  language?: string;
  visibility?: string;
}

interface SearchRequest {
  query?: string;
  filters?: SearchFilters;
  sort_by?: "price" | "rating" | "newest" | "relevance";
  page?: number;
  page_size?: number;
}

interface SearchResponse {
  data: any[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user?.id || null;

    // Parse request body
    const requestBody: SearchRequest = await req.json();
    
    const {
      query = "",
      filters = {},
      sort_by = "relevance",
      page = 1,
      page_size = 20,
    } = requestBody;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(Math.max(1, page_size), 100); // Max 100 items per page

    // Build the base query - ALWAYS filter for published content first
    let queryBuilder = supabaseClient
      .from("content")
      .select("*", { count: "exact" })
      .eq("status", "published"); // CRITICAL: Only published content

    // Apply visibility filter
    if (filters.visibility) {
      // If visibility is explicitly requested
      if (userId) {
        // Allow user to see their own content with that visibility
        queryBuilder = queryBuilder.or(
          `and(visibility.eq.${filters.visibility},uploaded_by.eq.${userId}),and(visibility.eq.${filters.visibility},visibility.eq.public)`
        );
      } else {
        queryBuilder = queryBuilder.eq("visibility", filters.visibility);
      }
    } else {
      // Default visibility logic
      if (userId) {
        // Show: public content OR user's own private content
        queryBuilder = queryBuilder.or(
          `visibility.eq.public,uploaded_by.eq.${userId}`
        );
      } else {
        // Not logged in: only public content
        queryBuilder = queryBuilder.eq("visibility", "public");
      }
    }

    // Apply full-text search if query is provided
    if (query && query.trim() !== "") {
      const searchQuery = query.trim().replace(/\s+/g, ' ');
      
      // Build search conditions
      const searchConditions: string[] = [];
      
      // Search in title (case-insensitive)
      searchConditions.push(`title.ilike.%${searchQuery}%`);
      
      // Search in description
      searchConditions.push(`description.ilike.%${searchQuery}%`);
      
      // Search in author
      searchConditions.push(`author.ilike.%${searchQuery}%`);
      
      // Search in subtitle
      searchConditions.push(`subtitle.ilike.%${searchQuery}%`);
      
      // Combine with OR
      queryBuilder = queryBuilder.or(searchConditions.join(','));
    }

    // Apply other filters
    
    // Category filter
    if (filters.category_id) {
      queryBuilder = queryBuilder.eq("category_id", filters.category_id);
    }

    // Content type filter
    if (filters.content_type) {
      queryBuilder = queryBuilder.eq("content_type", filters.content_type);
    }

    // Price range filter
    if (filters.price_min !== undefined && filters.price_min > 0) {
      queryBuilder = queryBuilder.gte("price", filters.price_min);
    }
    if (filters.price_max !== undefined && filters.price_max < 1000000) {
      queryBuilder = queryBuilder.lte("price", filters.price_max);
    }

    // Minimum rating filter
    if (filters.min_rating !== undefined && filters.min_rating > 0) {
      queryBuilder = queryBuilder.gte("average_rating", filters.min_rating);
    }

    // Free content filter
    if (filters.is_free === true) {
      queryBuilder = queryBuilder.eq("is_free", true);
    }

    // Language filter
    if (filters.language) {
      queryBuilder = queryBuilder.eq("language", filters.language);
    }

    // Apply sorting
    switch (sort_by) {
      case "price":
        queryBuilder = queryBuilder.order("price", { ascending: true });
        break;
      case "rating":
        queryBuilder = queryBuilder
          .order("average_rating", { ascending: false })
          .order("total_reviews", { ascending: false });
        break;
      case "newest":
        queryBuilder = queryBuilder.order("published_at", { 
          ascending: false, 
          nullsFirst: false 
        });
        break;
      case "relevance":
      default:
        // For relevance with search query, order by updated_at
        if (query && query.trim() !== "") {
          queryBuilder = queryBuilder.order("updated_at", { ascending: false });
        } else {
          queryBuilder = queryBuilder.order("created_at", { ascending: false });
        }
        break;
    }

    // Apply pagination
    const offset = (validatedPage - 1) * validatedPageSize;
    queryBuilder = queryBuilder.range(offset, offset + validatedPageSize - 1);

    // Execute the query
    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    // Add metadata to results to indicate if content is user's own
    const enrichedData = (data || []).map(item => ({
      ...item,
      is_own_content: userId && item.uploaded_by === userId,
    }));

    // Log the search (non-blocking)
    try {
      await supabaseClient.from("search_logs").insert({
        user_id: userId,
        search_query: query,
        results_count: count || 0,
        filters: filters,
      });
    } catch (logError) {
      console.error("Failed to log search:", logError);
    }

    // Prepare response
    const response: SearchResponse = {
      data: enrichedData,
      total: count || 0,
      page: validatedPage,
      page_size: validatedPageSize,
      total_pages: Math.ceil((count || 0) / validatedPageSize),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Search error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred during search",
        details: error,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});