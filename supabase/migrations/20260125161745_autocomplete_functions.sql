-- supabase/migrations/XXXXXX_autocomplete_enhancements.sql
-- Complete database functions and indexes for enhanced autocomplete

-- ============================================
-- FUNCTION: Get popular searches with grouping and counting
-- ============================================
CREATE OR REPLACE FUNCTION get_popular_searches(
  search_prefix TEXT,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  search_query TEXT,
  search_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.search_query,
    COUNT(*) as search_count
  FROM search_logs sl
  WHERE 
    sl.search_query IS NOT NULL 
    AND sl.search_query != ''
    AND sl.search_query ILIKE search_prefix || '%'
  GROUP BY sl.search_query
  ORDER BY search_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get trending tags with usage count
-- ============================================
CREATE OR REPLACE FUNCTION get_trending_tags(
  tag_prefix TEXT,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  tag_id UUID,
  tag_name VARCHAR(100),
  tag_slug VARCHAR(100),
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tag_id,
    t.name as tag_name,
    t.slug as tag_slug,
    COUNT(ct.content_id) as usage_count
  FROM tags t
  LEFT JOIN content_tags ct ON t.id = ct.tag_id
  WHERE t.name ILIKE tag_prefix || '%'
  GROUP BY t.id, t.name, t.slug
  ORDER BY usage_count DESC, t.name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get author suggestions with content count
-- ============================================
CREATE OR REPLACE FUNCTION get_author_suggestions(
  author_prefix TEXT,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  author_name VARCHAR(255),
  content_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.author as author_name,
    COUNT(*) as content_count
  FROM content c
  WHERE 
    c.author IS NOT NULL
    AND c.author != ''
    AND c.status = 'published'
    AND c.visibility = 'public'
    AND c.author ILIKE author_prefix || '%'
  GROUP BY c.author
  ORDER BY content_count DESC, c.author ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get user's recent searches (deduplicated)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_recent_searches(
  p_user_id UUID,
  search_prefix TEXT DEFAULT '',
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  search_query TEXT,
  last_searched_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_searches AS (
    SELECT 
      sl.search_query,
      MAX(sl.created_at) as last_searched_at,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(sl.search_query))
        ORDER BY MAX(sl.created_at) DESC
      ) as rn
    FROM search_logs sl
    WHERE 
      sl.user_id = p_user_id
      AND sl.search_query IS NOT NULL
      AND sl.search_query != ''
      AND (search_prefix = '' OR sl.search_query ILIKE search_prefix || '%')
    GROUP BY sl.search_query
  )
  SELECT 
    rs.search_query,
    rs.last_searched_at
  FROM ranked_searches rs
  WHERE rs.rn = 1
  ORDER BY rs.last_searched_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get personalized content recommendations
-- ============================================
CREATE OR REPLACE FUNCTION get_personalized_content(
  p_user_id UUID,
  search_query TEXT DEFAULT '',
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  content_id UUID,
  title VARCHAR(500),
  cover_image_url VARCHAR(500),
  content_type VARCHAR(50),
  relevance_score INTEGER
) AS $$
DECLARE
  user_interests TEXT[];
  interest_term TEXT;
BEGIN
  -- Get user's top search terms as interests
  SELECT ARRAY_AGG(DISTINCT word)
  INTO user_interests
  FROM (
    SELECT UNNEST(STRING_TO_ARRAY(LOWER(search_query), ' ')) as word
    FROM search_logs
    WHERE 
      user_id = p_user_id
      AND search_query IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
    LIMIT 100
  ) words
  WHERE LENGTH(word) > 3
  LIMIT 10;

  -- If no interests found, return empty
  IF user_interests IS NULL OR ARRAY_LENGTH(user_interests, 1) = 0 THEN
    RETURN;
  END IF;

  -- Find content matching user interests and search query
  RETURN QUERY
  SELECT 
    c.id as content_id,
    c.title,
    c.cover_image_url,
    c.content_type,
    -- Simple relevance scoring
    (
      CASE WHEN c.title ILIKE '%' || user_interests[1] || '%' THEN 3 ELSE 0 END +
      CASE WHEN c.description ILIKE '%' || user_interests[1] || '%' THEN 2 ELSE 0 END +
      CASE WHEN c.average_rating >= 4 THEN 1 ELSE 0 END
    ) as relevance_score
  FROM content c
  WHERE 
    c.status = 'published'
    AND c.visibility = 'public'
    AND (
      search_query = '' 
      OR c.title ILIKE '%' || search_query || '%'
    )
    AND (
      c.title ILIKE '%' || user_interests[1] || '%'
      OR c.description ILIKE '%' || user_interests[1] || '%'
      OR (ARRAY_LENGTH(user_interests, 1) > 1 AND (
        c.title ILIKE '%' || user_interests[2] || '%'
        OR c.description ILIKE '%' || user_interests[2] || '%'
      ))
    )
  ORDER BY relevance_score DESC, c.average_rating DESC, c.view_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Indexes for autocomplete prefix matching
CREATE INDEX IF NOT EXISTS idx_search_logs_query_prefix 
ON search_logs (search_query text_pattern_ops)
WHERE search_query IS NOT NULL AND search_query != '';

CREATE INDEX IF NOT EXISTS idx_tags_name_prefix 
ON tags (name text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_content_title_prefix 
ON content (title text_pattern_ops) 
WHERE status = 'published' AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_content_author_prefix 
ON content (author text_pattern_ops)
WHERE author IS NOT NULL AND status = 'published' AND visibility = 'public';

-- Index for content_tags if not exists
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id 
ON content_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_content_tags_content_id 
ON content_tags(content_id);

-- Indexes for user-specific features
CREATE INDEX IF NOT EXISTS idx_search_logs_user_created 
ON search_logs(user_id, created_at DESC)
WHERE search_query IS NOT NULL AND search_query != '';

-- Index for trending content
CREATE INDEX IF NOT EXISTS idx_content_trending 
ON content(status, visibility, view_count DESC, average_rating DESC)
WHERE status = 'published' AND visibility = 'public';

-- Composite index for better autocomplete performance
CREATE INDEX IF NOT EXISTS idx_content_autocomplete 
ON content(status, visibility, title, author)
WHERE status = 'published' AND visibility = 'public';

-- ============================================
-- HELPER VIEWS (Optional - for analytics)
-- ============================================

-- View: Most searched terms (last 30 days)
CREATE OR REPLACE VIEW popular_searches_30d AS
SELECT 
  search_query,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_searched
FROM search_logs
WHERE 
  created_at > NOW() - INTERVAL '30 days'
  AND search_query IS NOT NULL
  AND search_query != ''
GROUP BY search_query
ORDER BY search_count DESC;

-- View: Top authors by content count
CREATE OR REPLACE VIEW top_authors AS
SELECT 
  author,
  COUNT(*) as content_count,
  AVG(average_rating) as avg_rating,
  SUM(view_count) as total_views
FROM content
WHERE 
  author IS NOT NULL
  AND status = 'published'
  AND visibility = 'public'
GROUP BY author
ORDER BY content_count DESC;

-- View: Trending tags
CREATE OR REPLACE VIEW trending_tags AS
SELECT 
  t.id,
  t.name,
  t.slug,
  COUNT(ct.content_id) as usage_count,
  COUNT(DISTINCT CASE 
    WHEN c.created_at > NOW() - INTERVAL '7 days' 
    THEN ct.content_id 
  END) as recent_usage
FROM tags t
LEFT JOIN content_tags ct ON t.id = ct.tag_id
LEFT JOIN content c ON ct.content_id = c.id
GROUP BY t.id, t.name, t.slug
ORDER BY usage_count DESC;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION get_popular_searches IS 
'Returns popular search queries matching a prefix, ordered by frequency';

COMMENT ON FUNCTION get_trending_tags IS 
'Returns trending tags matching a prefix with their usage count';

COMMENT ON FUNCTION get_author_suggestions IS 
'Returns author names matching a prefix with their content count';

COMMENT ON FUNCTION get_user_recent_searches IS 
'Returns deduplicated recent searches for a specific user';

COMMENT ON FUNCTION get_personalized_content IS 
'Returns personalized content recommendations based on user search history';

COMMENT ON VIEW popular_searches_30d IS 
'Shows most popular search terms from the last 30 days';

COMMENT ON VIEW top_authors IS 
'Shows authors ranked by number of published content';

COMMENT ON VIEW trending_tags IS 
'Shows all tags with usage statistics and recent activity';