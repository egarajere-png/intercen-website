// components/search/AutocompleteSearch.tsx
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/SupabaseClient';
import { 
  Search, 
  TrendingUp, 
  Hash, 
  BookOpen, 
  Loader2, 
  Clock, 
  User, 
  Sparkles,
  AlertCircle,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  | PersonalizedSuggestion;

interface AutocompleteSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
  showPersonalized?: boolean;
}

export function AutocompleteSearch({ 
  onSearch, 
  placeholder = "Search books, documents, and more...",
  className,
  showRecentSearches = true,
  showPersonalized = true,
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [spellingCorrection, setSpellingCorrection] = useState<SpellingSuggestion | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  // Fetch suggestions
  const fetchSuggestions = async (searchQuery: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-autocomplete', {
        body: { 
          query: searchQuery, 
          limit: 12,
          include_recent: showRecentSearches,
          include_personalized: showPersonalized,
        },
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
      setSpellingCorrection(data.spelling_correction || null);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
      setSpellingCorrection(null);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (isOpen) {
        fetchSuggestions(query);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, isOpen]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === 'title') {
      navigate(`/content/${suggestion.content_id}`);
    } else if (suggestion.type === 'personalized') {
      navigate(`/content/${suggestion.content_id}`);
    } else if (suggestion.type === 'tag') {
      navigate(`/search?tag=${suggestion.slug}`);
    } else if (suggestion.type === 'author') {
      navigate(`/search?author=${encodeURIComponent(suggestion.value)}`);
    } else {
      setQuery(suggestion.value);
      if (onSearch) {
        onSearch(suggestion.value);
      } else {
        navigate(`/search?q=${encodeURIComponent(suggestion.value)}`);
      }
    }
    setIsOpen(false);
  };

  // Handle spelling correction click
  const handleSpellingCorrection = () => {
    if (spellingCorrection) {
      setQuery(spellingCorrection.suggestion);
      if (onSearch) {
        onSearch(spellingCorrection.suggestion);
      } else {
        navigate(`/search?q=${encodeURIComponent(spellingCorrection.suggestion)}`);
      }
      setIsOpen(false);
    }
  };

  // Handle search submit
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
      setIsOpen(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (suggestion: Suggestion) => {
    switch (suggestion.type) {
      case 'title':
        return <BookOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      case 'author':
        return <User className="h-4 w-4 text-indigo-500 flex-shrink-0" />;
      case 'popular':
        return <TrendingUp className="h-4 w-4 text-orange-500 flex-shrink-0" />;
      case 'recent':
        return <Clock className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'tag':
        return <Hash className="h-4 w-4 text-purple-500 flex-shrink-0" />;
      case 'personalized':
        return <Sparkles className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  // Format rating stars
  const renderRating = (rating?: number) => {
    if (!rating || rating === 0) return null;
    return (
      <div className="flex items-center gap-1">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Format price
  const formatPrice = (price?: number) => {
    if (!price) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  // Format suggestion display
  const formatSuggestion = (suggestion: Suggestion) => {
    switch (suggestion.type) {
      case 'title':
        return (
          <div className="flex gap-3 w-full items-center">
            {/* Cover Image Preview */}
            {suggestion.cover_image_url ? (
              <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                <img 
                  src={suggestion.cover_image_url} 
                  alt={suggestion.value}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-10 h-14 flex-shrink-0 rounded bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-400">
                  {suggestion.value.charAt(0)}
                </span>
              </div>
            )}
            
            {/* Content Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{suggestion.value}</div>
              {suggestion.author && (
                <div className="text-xs text-muted-foreground truncate">
                  by {suggestion.author}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {renderRating(suggestion.average_rating)}
                {suggestion.price !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {formatPrice(suggestion.price)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'author':
        return (
          <div className="flex items-center justify-between w-full">
            <span className="font-medium">{suggestion.value}</span>
            <span className="text-xs text-muted-foreground">
              {suggestion.content_count} {suggestion.content_count === 1 ? 'book' : 'books'}
            </span>
          </div>
        );
        
      case 'popular':
        return (
          <div className="flex items-center justify-between w-full">
            <span>{suggestion.value}</span>
            <span className="text-xs text-muted-foreground">
              {suggestion.count} searches
            </span>
          </div>
        );
        
      case 'recent':
        return (
          <div className="flex items-center justify-between w-full">
            <span>{suggestion.value}</span>
            <span className="text-xs text-muted-foreground">Recent</span>
          </div>
        );
        
      case 'tag':
        return (
          <div className="flex items-center justify-between w-full">
            <span>{suggestion.value}</span>
            <span className="text-xs text-muted-foreground">
              {suggestion.usage_count} items
            </span>
          </div>
        );
        
      case 'personalized':
        return (
          <div className="flex gap-3 w-full items-center">
            {suggestion.cover_image_url && (
              <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                <img 
                  src={suggestion.cover_image_url} 
                  alt={suggestion.value}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{suggestion.value}</div>
              <div className="text-xs text-muted-foreground truncate">
                {suggestion.reason}
              </div>
            </div>
          </div>
        );
    }
  };

  // Group suggestions by type
  const groupedSuggestions = {
    recent: suggestions.filter(s => s.type === 'recent'),
    personalized: suggestions.filter(s => s.type === 'personalized'),
    titles: suggestions.filter(s => s.type === 'title'),
    authors: suggestions.filter(s => s.type === 'author'),
    popular: suggestions.filter(s => s.type === 'popular'),
    tags: suggestions.filter(s => s.type === 'tag'),
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-[--radix-popover-trigger-width] max-w-2xl" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList className="max-h-[400px]">
            {/* Spelling Correction */}
            {spellingCorrection && (
              <div 
                className="px-4 py-3 border-b bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={handleSpellingCorrection}
              >
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-muted-foreground">Did you mean:</span>
                  <span className="font-medium text-foreground">
                    {spellingCorrection.suggestion}
                  </span>
                </div>
              </div>
            )}

            {suggestions.length === 0 && !loading && (
              <CommandEmpty>
                {query.length > 0 ? 'No suggestions found' : 'Start typing to search...'}
              </CommandEmpty>
            )}

            {suggestions.length > 0 && (
              <>
                {/* Recent Searches */}
                {groupedSuggestions.recent.length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {groupedSuggestions.recent.map((suggestion, index) => (
                      <CommandItem
                        key={`recent-${index}`}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "cursor-pointer",
                          selectedIndex === suggestions.indexOf(suggestion) && "bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getSuggestionIcon(suggestion)}
                          {formatSuggestion(suggestion)}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Personalized Suggestions */}
                {groupedSuggestions.personalized.length > 0 && (
                  <CommandGroup heading="Recommended for You">
                    {groupedSuggestions.personalized.map((suggestion, index) => (
                      <CommandItem
                        key={`personalized-${index}`}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "cursor-pointer",
                          selectedIndex === suggestions.indexOf(suggestion) && "bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getSuggestionIcon(suggestion)}
                          {formatSuggestion(suggestion)}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Content Titles */}
                {groupedSuggestions.titles.length > 0 && (
                  <CommandGroup heading="Content">
                    {groupedSuggestions.titles.map((suggestion, index) => (
                      <CommandItem
                        key={`title-${index}`}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "cursor-pointer py-3",
                          selectedIndex === suggestions.indexOf(suggestion) && "bg-accent"
                        )}
                      >
                        <div className="flex items-start gap-2 w-full">
                          {getSuggestionIcon(suggestion)}
                          {formatSuggestion(suggestion)}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Authors */}
                {groupedSuggestions.authors.length > 0 && (
                  <CommandGroup heading="Authors">
                    {groupedSuggestions.authors.map((suggestion, index) => (
                      <CommandItem
                        key={`author-${index}`}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "cursor-pointer",
                          selectedIndex === suggestions.indexOf(suggestion) && "bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getSuggestionIcon(suggestion)}
                          {formatSuggestion(suggestion)}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Popular Searches */}
                {groupedSuggestions.popular.length > 0 && (
                  <CommandGroup heading="Popular Searches">
                    {groupedSuggestions.popular.map((suggestion, index) => (
                      <CommandItem
                        key={`popular-${index}`}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "cursor-pointer",
                          selectedIndex === suggestions.indexOf(suggestion) && "bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getSuggestionIcon(suggestion)}
                          {formatSuggestion(suggestion)}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Tags */}
                {groupedSuggestions.tags.length > 0 && (
                  <CommandGroup heading="Tags">
                    {groupedSuggestions.tags.map((suggestion, index) => (
                      <CommandItem
                        key={`tag-${index}`}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "cursor-pointer",
                          selectedIndex === suggestions.indexOf(suggestion) && "bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getSuggestionIcon(suggestion)}
                          {formatSuggestion(suggestion)}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}