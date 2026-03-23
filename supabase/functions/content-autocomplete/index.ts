// supabase/functions/content-autocomplete/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutocompleteRequest {
  query: string;
  limit?: number;
  include_recent?: boolean;
  include_personalized?: boolean;
}

interface TitleSuggestion {
  type: 'title';
  value: string;
  author?: string;
  content_id: string;
  content_type?: string;
  cover_image_url?: string;
  price?: number;
  average_rating?: number;
}

interface AuthorSuggestion {
  type: 'author';
  value: string;
  content_count: number;
}

interface PopularSearch {
  type: 'popular';
  value: string;
  count: number;
}

interface RecentSearch {
  type: 'recent';
  value: string;
  searched_at: string;
}

interface TrendingTag {
  type: 'tag';
  value: string;
  usage_count: number;
  slug: string;
}

interface PersonalizedSuggestion {
  type: 'personalized';
  value: string;
  content_id: string;
  reason: string;
  cover_image_url?: string;
}

interface SpellingSuggestion {
  type: 'spelling';
  original: string;
  suggestion: string;
}

type Suggestion = 
  | TitleSuggestion 
  | AuthorSuggestion 
  | PopularSearch 
  | RecentSearch 
  | TrendingTag 
  | PersonalizedSuggestion
  | SpellingSuggestion;

interface AutocompleteResponse {
  suggestions: Suggestion[];
  query: string;
  total_suggestions: number;
  spelling_correction?: SpellingSuggestion;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user?.id || null;

    const requestBody: AutocompleteRequest = await req.json();
    const query = requestBody.query?.trim() || "";
    const limit = requestBody.limit || 12;
    const includeRecent = requestBody.include_recent !== false;
    const includePersonalized = requestBody.include_personalized !== false;

    if (query.length < 2) {
      const defaultSuggestions = await getDefaultSuggestions(
        supabaseClient, 
        userId, 
        limit,
        includeRecent,
        includePersonalized
      );
      
      return new Response(
        JSON.stringify({
          suggestions: defaultSuggestions,
          query: query,
          total_suggestions: defaultSuggestions.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const spellingCorrection = await getSpellingCorrection(supabaseClient, query);

    const [
      titleSuggestions, 
      authorSuggestions,
      popularSearches, 
      recentSearches,
      trendingTags,
      personalizedSuggestions
    ] = await Promise.all([
      getTitleSuggestions(supabaseClient, query, Math.ceil(limit * 0.35)),
      getAuthorSuggestions(supabaseClient, query, Math.ceil(limit * 0.15)),
      getPopularSearches(supabaseClient, query, Math.ceil(limit * 0.15)),
      includeRecent && userId ? getRecentSearches(supabaseClient, userId, query, Math.ceil(limit * 0.15)) : Promise.resolve([]),
      getTrendingTags(supabaseClient, query, Math.ceil(limit * 0.15)),
      includePersonalized && userId ? getPersonalizedSuggestions(supabaseClient, userId, query, Math.ceil(limit * 0.15)) : Promise.resolve([]),
    ]);

    const allSuggestions: Suggestion[] = [
      ...recentSearches,
      ...personalizedSuggestions,
      ...titleSuggestions,
      ...authorSuggestions,
      ...popularSearches,
      ...trendingTags,
    ].slice(0, limit);

    const response: AutocompleteResponse = {
      suggestions: allSuggestions,
      query: query,
      total_suggestions: allSuggestions.length,
      spelling_correction: spellingCorrection || undefined,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Autocomplete error:", err);
    
    return new Response(
      JSON.stringify({
        error: err.message || "An error occurred during autocomplete",
        suggestions: [],
        query: "",
        total_suggestions: 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function getTitleSuggestions(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit: number
): Promise<TitleSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from("content")
      .select("id, title, author, content_type, cover_image_url, price, average_rating")
      .eq("status", "published")
      .eq("visibility", "public")
      .or(`title.ilike.${query}%,title.ilike.% ${query}%`)
      .order("view_count", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Title suggestions error:", error);
      return [];
    }

    return (data || []).map((item: { id: string; title: string; author?: string; content_type?: string; cover_image_url?: string; price?: string; average_rating?: string }) => ({
      type: 'title' as const,
      value: item.title,
      author: item.author,
      content_id: item.id,
      content_type: item.content_type,
      cover_image_url: item.cover_image_url,
      price: item.price ? parseFloat(item.price) : undefined,
      average_rating: item.average_rating ? parseFloat(item.average_rating) : undefined,
    }));
  } catch (error) {
    console.error("Error fetching title suggestions:", error);
    return [];
  }
}

async function getAuthorSuggestions(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit: number
): Promise<AuthorSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from("content")
      .select("author")
      .eq("status", "published")
      .eq("visibility", "public")
      .not("author", "is", null)
      .ilike("author", `${query}%`)
      .limit(100);

    if (error || !data) {
      console.error("Author suggestions error:", error);
      return [];
    }

    const authorCounts = new Map<string, number>();
    data.forEach((item: { author: string }) => {
      const author = item.author.trim();
      authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
    });

    return Array.from(authorCounts.entries())
      .map(([author, count]) => ({
        type: 'author' as const,
        value: author,
        content_count: count,
      }))
      .sort((a, b) => b.content_count - a.content_count)
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching author suggestions:", error);
    return [];
  }
}

async function getPopularSearches(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit: number
): Promise<PopularSearch[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_searches', {
      search_prefix: query,
      result_limit: limit
    });

    if (error) {
      return await getPopularSearchesDirect(supabase, query, limit);
    }

    return (data || []).map((item: { search_query: string; search_count: number }) => ({
      type: 'popular' as const,
      value: item.search_query,
      count: item.search_count,
    }));
  } catch (error) {
    console.error("Error fetching popular searches:", error);
    return [];
  }
}

async function getPopularSearchesDirect(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit: number
): Promise<PopularSearch[]> {
  try {
    const { data, error } = await supabase
      .from("search_logs")
      .select("search_query")
      .ilike("search_query", `${query}%`)
      .not("search_query", "is", null)
      .not("search_query", "eq", "")
      .limit(1000);

    if (error || !data) return [];

    const counts = new Map<string, number>();
    data.forEach((item: { search_query: string }) => {
      const q = item.search_query.toLowerCase().trim();
      counts.set(q, (counts.get(q) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([value, count]) => ({
        type: 'popular' as const,
        value,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error("Error in direct popular searches:", error);
    return [];
  }
}

async function getRecentSearches(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  query: string,
  limit: number
): Promise<RecentSearch[]> {
  try {
    const { data, error } = await supabase
      .from("search_logs")
      .select("search_query, created_at")
      .eq("user_id", userId)
      .not("search_query", "is", null)
      .not("search_query", "eq", "")
      .ilike("search_query", `${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit * 2);

    if (error || !data) {
      console.error("Recent searches error:", error);
      return [];
    }

    const seen = new Set<string>();
    const uniqueSearches: RecentSearch[] = [];

    for (const item of data) {
      const q = item.search_query.toLowerCase().trim();
      if (!seen.has(q)) {
        seen.add(q);
        uniqueSearches.push({
          type: 'recent' as const,
          value: item.search_query,
          searched_at: item.created_at,
        });
      }
      if (uniqueSearches.length >= limit) break;
    }

    return uniqueSearches;
  } catch (error) {
    console.error("Error fetching recent searches:", error);
    return [];
  }
}

async function getTrendingTags(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit: number
): Promise<TrendingTag[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_tags', {
      tag_prefix: query,
      result_limit: limit
    });

    if (error) {
      return await getTrendingTagsDirect(supabase, query, limit);
    }

    return (data || []).map((item: { tag_name: string; tag_slug: string; usage_count: number }) => ({
      type: 'tag' as const,
      value: item.tag_name,
      slug: item.tag_slug,
      usage_count: item.usage_count,
    }));
  } catch (error) {
    console.error("Error fetching trending tags:", error);
    return [];
  }
}

async function getTrendingTagsDirect(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit: number
): Promise<TrendingTag[]> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select(`
        id,
        name,
        slug,
        content_tags(count)
      `)
      .ilike("name", `${query}%`)
      .limit(limit * 3);

    if (error || !data) return [];

    return data
      .map((tag: { name: string; slug: string; content_tags?: { count: number }[] }) => ({
        type: 'tag' as const,
        value: tag.name,
        slug: tag.slug,
        usage_count: tag.content_tags?.length || 0,
      }))
      .sort((a: TrendingTag, b: TrendingTag) => b.usage_count - a.usage_count)
      .slice(0, limit);
  } catch (error) {
    console.error("Error in direct trending tags:", error);
    return [];
  }
}

async function getPersonalizedSuggestions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  query: string,
  limit: number
): Promise<PersonalizedSuggestion[]> {
  try {
    const { data: searchHistory } = await supabase
      .from("search_logs")
      .select("search_query")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!searchHistory || searchHistory.length === 0) return [];

    const terms = searchHistory
      .map((s: { search_query: string }) => s.search_query?.toLowerCase().split(" "))
      .flat()
      .filter((t: string) => t && t.length > 3);

    const termCounts = new Map<string, number>();
    terms.forEach((term: string) => {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    });

    const topTerms = Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([term]) => term);

    if (topTerms.length === 0) return [];

    const orConditions = topTerms.map(term => 
      `title.ilike.%${term}%,description.ilike.%${term}%`
    ).join(',');

    const { data, error } = await supabase
      .from("content")
      .select("id, title, cover_image_url, content_type")
      .eq("status", "published")
      .eq("visibility", "public")
      .or(orConditions)
      .ilike("title", `%${query}%`)
      .order("average_rating", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((item: { id: string; title: string; cover_image_url?: string }) => ({
      type: 'personalized' as const,
      value: item.title,
      content_id: item.id,
      reason: `Based on your interest in ${topTerms[0]}`,
      cover_image_url: item.cover_image_url,
    }));
  } catch (error) {
    console.error("Error fetching personalized suggestions:", error);
    return [];
  }
}

async function getSpellingCorrection(
  supabase: ReturnType<typeof createClient>,
  query: string
): Promise<SpellingSuggestion | null> {
  try {
    const { data, error } = await supabase
      .from("search_logs")
      .select("search_query")
      .not("search_query", "is", null)
      .limit(1000);

    if (error || !data) return null;

    const knownTerms = new Set<string>();
    data.forEach((item: { search_query: string }) => {
      if (item.search_query) {
        knownTerms.add(item.search_query.toLowerCase().trim());
      }
    });

    if (knownTerms.has(query.toLowerCase())) return null;

    let closestMatch = "";
    let minDistance = Infinity;

    for (const term of knownTerms) {
      const distance = levenshteinDistance(query.toLowerCase(), term);
      if (distance > 0 && distance < 3 && distance < minDistance) {
        minDistance = distance;
        closestMatch = term;
      }
    }

    if (closestMatch && minDistance <= 2) {
      return {
        type: 'spelling' as const,
        original: query,
        suggestion: closestMatch,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting spelling correction:", error);
    return null;
  }
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

async function getDefaultSuggestions(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  limit: number,
  includeRecent: boolean,
  _includePersonalized: boolean
): Promise<Suggestion[]> {
  try {
    const suggestions: Suggestion[] = [];

    if (userId && includeRecent) {
      const { data: recentData } = await supabase
        .from("search_logs")
        .select("search_query, created_at")
        .eq("user_id", userId)
        .not("search_query", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentData) {
        const seen = new Set<string>();
        recentData.forEach((item: { search_query: string; created_at: string }) => {
          const q = item.search_query.toLowerCase().trim();
          if (!seen.has(q)) {
            seen.add(q);
            suggestions.push({
              type: 'recent',
              value: item.search_query,
              searched_at: item.created_at,
            });
          }
        });
      }
    }

    const { data: topContent } = await supabase
      .from("content")
      .select("id, title, author, content_type, cover_image_url, price, average_rating")
      .eq("status", "published")
      .eq("visibility", "public")
      .order("view_count", { ascending: false })
      .limit(4);

    if (topContent) {
      topContent.forEach((item: { id: string; title: string; author?: string; content_type?: string; cover_image_url?: string; price?: string; average_rating?: string }) => {
        suggestions.push({
          type: 'title',
          value: item.title,
          author: item.author,
          content_id: item.id,
          content_type: item.content_type,
          cover_image_url: item.cover_image_url,
          price: item.price ? parseFloat(item.price) : undefined,
          average_rating: item.average_rating ? parseFloat(item.average_rating) : undefined,
        });
      });
    }

    const { data: topTags } = await supabase
      .from("tags")
      .select(`
        id,
        name,
        slug,
        content_tags(count)
      `)
      .limit(20);

    if (topTags) {
      topTags
        .map((tag: { name: string; slug: string; content_tags?: { count: number }[] }) => ({
          type: 'tag' as const,
          value: tag.name,
          slug: tag.slug,
          usage_count: tag.content_tags?.length || 0,
        }))
        .sort((a: TrendingTag, b: TrendingTag) => b.usage_count - a.usage_count)
        .slice(0, 3)
        .forEach((tag: TrendingTag) => suggestions.push(tag));
    }

    return suggestions.slice(0, limit);
  } catch (error) {
    console.error("Error fetching default suggestions:", error);
    return [];
  }
}