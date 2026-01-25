import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/SupabaseClient';
import { Content } from '@/types/content.types';
import { Search, Filter, Loader2, Star, Download, Eye, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const defaultFilters: SearchFilters = {
  category_id: '',
  content_type: '',
  price_min: 0,
  price_max: 1000,
  min_rating: 0,
  is_free: false,
  language: '',
  visibility: '',
};

const CONTENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'book', label: 'Book' },
  { value: 'ebook', label: 'E-Book' },
  { value: 'document', label: 'Document' },
  { value: 'paper', label: 'Paper' },
  { value: 'report', label: 'Report' },
  { value: 'manual', label: 'Manual' },
  { value: 'guide', label: 'Guide' },
];

// Safe BookCard component with proper null checks
function SafeBookCard({ book }: { book: Content }) {
  const navigate = useNavigate();

  // Safe price formatting
  const formatPrice = (price: any) => {
    if (price === null || price === undefined || price === '') return '0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  // Safe rating formatting
  const formatRating = (rating: any) => {
    if (rating === null || rating === undefined || rating === '') return 0;
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(numRating) ? 0 : numRating;
  };

  const displayPrice = formatPrice(book.price);
  const displayRating = formatRating(book.average_rating);
  const isFree = book.is_free || displayPrice === '0.00';

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => navigate(`/content/${book.id}`)}
    >
      <CardHeader className="p-0">
        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title || 'Content cover'}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/300x400?text=No+Cover';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
              <span className="text-4xl font-bold text-gray-400">
                {book.title?.charAt(0) || '?'}
              </span>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {book.is_featured && (
              <Badge className="bg-yellow-500 text-white">Featured</Badge>
            )}
            {book.is_bestseller && (
              <Badge className="bg-red-500 text-white">Bestseller</Badge>
            )}
            {book.is_new_arrival && (
              <Badge className="bg-green-500 text-white">New</Badge>
            )}
            {isFree && (
              <Badge className="bg-blue-500 text-white">Free</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
          {book.title || 'Untitled'}
        </h3>

        {/* Author */}
        {book.author && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
            by {book.author}
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium">
            {displayRating > 0 ? displayRating.toFixed(1) : 'No ratings'}
          </span>
          {(book.total_reviews || 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              ({book.total_reviews})
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(book.total_downloads || 0) > 0 && (
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>{book.total_downloads}</span>
            </div>
          )}
          {(book.view_count || 0) > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{book.view_count}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="flex-1">
          {isFree ? (
            <span className="text-lg font-bold text-green-600">Free</span>
          ) : (
            <span className="text-lg font-bold">
              ${displayPrice}
            </span>
          )}
        </div>
        
        {book.is_for_sale && !isFree && (
          <Button size="sm" variant="default" onClick={(e) => {
            e.stopPropagation();
            // Add to cart logic here
          }}>
            <ShoppingCart className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function ContentSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<'relevance' | 'price' | 'rating' | 'newest'>('relevance');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [results, setResults] = useState<Content[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  // Perform search
  const handleSearch = async () => {
    setLoading(true);
    try {
      // Clean up filters - remove empty strings, undefined, and 'all' placeholder values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, v]) => {
          if (v === '' || v === undefined || v === null) return false;
          if (v === 'all') return false; // Remove 'all' placeholder values
          if (key === 'price_min' && v === 0) return false;
          if (key === 'price_max' && v === 1000) return false;
          if (key === 'min_rating' && v === 0) return false;
          if (key === 'is_free' && v === false) return false;
          return true;
        })
      );

      const { data, error } = await supabase.functions.invoke('content-search', {
        body: {
          query: query.trim(),
          filters: cleanFilters,
          sort_by: sortBy,
          page,
          page_size: pageSize,
        },
      });

      if (error) throw error;

      setResults(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 0);

      if (data.data?.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try adjusting your search or filters',
        });
      }
    } catch (err: any) {
      console.error('Search error:', err);
      toast({
        title: 'Search failed',
        description: err.message || 'An error occurred while searching',
        variant: 'destructive',
      });
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Search on mount and when dependencies change
  useEffect(() => {
    handleSearch();
  }, [page, sortBy]); // Trigger search when page or sort changes

  // Reset to page 1 when filters or query change
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1); // Reset to first page
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(v => {
    if (v === '' || v === undefined || v === null) return false;
    if (v === 'all') return false;
    if (v === 0 || v === false) return false;
    if (v === 1000) return false; // default max price
    return true;
  }).length;

  return (
    <Layout>
      <div className="container py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Content</h1>
          <p className="text-muted-foreground">
            Find books, documents, and resources across our library
          </p>
        </div>

        {/* Search Bar and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title, author, or description..."
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              className="pl-10"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="price">Price (Low to High)</SelectItem>
              <SelectItem value="rating">Rating (High to Low)</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center" variant="secondary">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Results</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={filters.category_id || 'all'}
                    onValueChange={value => handleFilterChange({ category_id: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type Filter */}
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select
                    value={filters.content_type || 'all'}
                    onValueChange={value => handleFilterChange({ content_type: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label>Price Range: ${filters.price_min} - ${filters.price_max}</Label>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">Min Price</Label>
                      <Input
                        type="number"
                        value={filters.price_min}
                        onChange={e => handleFilterChange({ price_min: Number(e.target.value) })}
                        min={0}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max Price</Label>
                      <Input
                        type="number"
                        value={filters.price_max}
                        onChange={e => handleFilterChange({ price_max: Number(e.target.value) })}
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-2">
                  <Label>Minimum Rating: {filters.min_rating} ⭐</Label>
                  <Select
                    value={String(filters.min_rating || 0)}
                    onValueChange={value => handleFilterChange({ min_rating: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="1">1+ Stars</SelectItem>
                      <SelectItem value="2">2+ Stars</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Free Content Only */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_free"
                    checked={filters.is_free}
                    onCheckedChange={checked => handleFilterChange({ is_free: checked as boolean })}
                  />
                  <Label htmlFor="is_free" className="cursor-pointer">
                    Show only free content
                  </Label>
                </div>

                {/* Visibility Filter */}
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={filters.visibility || 'all'}
                    onValueChange={value => handleFilterChange({ visibility: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Visible to Me" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Visible to Me</SelectItem>
                      <SelectItem value="public">Public Only</SelectItem>
                      <SelectItem value="private">Private Only</SelectItem>
                      <SelectItem value="organization">Organization Only</SelectItem>
                      <SelectItem value="restricted">Restricted Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClearFilters}
                  disabled={activeFilterCount === 0}
                >
                  Clear All Filters
                </Button>

                {/* Apply Filters */}
                <Button className="w-full" onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button onClick={handleSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.category_id && filters.category_id !== 'all' && (
              <Badge variant="secondary">
                Category: {categories.find(c => c.id === filters.category_id)?.name}
              </Badge>
            )}
            {filters.content_type && filters.content_type !== 'all' && (
              <Badge variant="secondary">
                Type: {CONTENT_TYPES.find(t => t.value === filters.content_type)?.label}
              </Badge>
            )}
            {(filters.price_min !== 0 || filters.price_max !== 1000) && (
              <Badge variant="secondary">
                Price: ${filters.price_min} - ${filters.price_max}
              </Badge>
            )}
            {filters.min_rating && filters.min_rating > 0 && (
              <Badge variant="secondary">
                Rating: {filters.min_rating}+ ⭐
              </Badge>
            )}
            {filters.is_free && (
              <Badge variant="secondary">Free Only</Badge>
            )}
            {filters.visibility && filters.visibility !== 'all' && (
              <Badge variant="secondary">
                {filters.visibility.charAt(0).toUpperCase() + filters.visibility.slice(1)}
              </Badge>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {results.map(content => (
                <SafeBookCard key={content.id} book={content} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No results found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}