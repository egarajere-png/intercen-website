// supabase/functions/content-search/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

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

    // Start building the query
    let queryBuilder = supabaseClient
      .from("content")
      .select("*", { count: "exact" });

    // Apply full-text search if query is provided
    if (query && query.trim() !== "") {
      const searchQuery = query.trim();
      
      // Use full-text search with to_tsquery
      // We'll use websearch_to_tsquery for better handling of user queries
      queryBuilder = queryBuilder.or(
        `search_vector.wfts.${searchQuery},title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`
      );
    }

    // Apply filters
    
    // Category filter
    if (filters.category_id) {
      queryBuilder = queryBuilder.eq("category_id", filters.category_id);
    }

    // Content type filter
    if (filters.content_type) {
      queryBuilder = queryBuilder.eq("content_type", filters.content_type);
    }

    // Price range filter
    if (filters.price_min !== undefined) {
      queryBuilder = queryBuilder.gte("price", filters.price_min);
    }
    if (filters.price_max !== undefined) {
      queryBuilder = queryBuilder.lte("price", filters.price_max);
    }

    // Minimum rating filter
    if (filters.min_rating !== undefined) {
      queryBuilder = queryBuilder.gte("average_rating", filters.min_rating);
    }

    // Free content filter
    if (filters.is_free !== undefined) {
      queryBuilder = queryBuilder.eq("is_free", filters.is_free);
    }

    // Language filter
    if (filters.language) {
      queryBuilder = queryBuilder.eq("language", filters.language);
    }

    // Get user ID for private content access
    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user?.id || null;

    // Visibility filter - show public content + user's own private content
    if (filters.visibility) {
      // If visibility is explicitly requested, filter for it
      queryBuilder = queryBuilder.eq("visibility", filters.visibility);
    } else {
      // Default: show public content OR content uploaded by the current user
      if (userId) {
        queryBuilder = queryBuilder.or(`visibility.eq.public,uploaded_by.eq.${userId}`);
      } else {
        queryBuilder = queryBuilder.eq("visibility", "public");
      }
    }

    // Always filter for published content
    queryBuilder = queryBuilder.eq("status", "published");

    // Apply sorting
    switch (sort_by) {
      case "price":
        queryBuilder = queryBuilder.order("price", { ascending: true });
        break;
      case "rating":
        queryBuilder = queryBuilder.order("average_rating", { ascending: false });
        break;
      case "newest":
        queryBuilder = queryBuilder.order("published_at", { ascending: false, nullsFirst: false });
        break;
      case "relevance":
      default:
        // For relevance, if there's a query, order by created_at as fallback
        // In a production environment, you'd use ts_rank for proper relevance scoring
        if (query && query.trim() !== "") {
          queryBuilder = queryBuilder.order("created_at", { ascending: false });
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
      throw error;
    }

    // Log the search (userId was already retrieved above for visibility filter)
    try {
      await supabaseClient.from("search_logs").insert({
        user_id: userId,
        search_query: query,
        results_count: count || 0,
        filters: filters,
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error("Failed to log search:", logError);
    }

    // Prepare response
    const response: SearchResponse = {
      data: data || [],
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