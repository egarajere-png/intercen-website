/**
 * Books/Content Library Page
 * Displays content with search, filtering, and add-to-cart functionality
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, Filter, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { BookCard } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
// ...removed categories import...
import { Content } from '@/types/content.types';
import { supabase } from '@/lib/SupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';

// All content types from the database
const CONTENT_TYPES = [
  { value: 'book', label: 'Book' },
  { value: 'ebook', label: 'E-Book' },
  { value: 'document', label: 'Document' },
  { value: 'paper', label: 'Paper' },
  { value: 'report', label: 'Report' },
  { value: 'manual', label: 'Manual' },
  { value: 'guide', label: 'Guide' },
];

const Books = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [visibility, setVisibility] = useState<string>('all');
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const { toast } = useToast();
  const { addToCart: addToCartContext } = useCart();

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      
      // Build filters for edge function
      let filters: any = {};
      
      // Filter by category
      if (selectedCategories.length === 1) {
        const cat = categories.find(c => c.slug === selectedCategories[0]);
        if (cat) filters.category_id = cat.id;
      }
      
      // Filter by content types
      if (selectedContentTypes.length > 0) {
        filters.content_types = selectedContentTypes;
      }
      
      // Filter by price range
      if (priceRange !== 'all') {
        if (priceRange === 'free') {
          filters.is_free = true;
        } else if (priceRange === 'under-15') {
          filters.price_max = 2000;
        } else if (priceRange === '15-25') {
          filters.price_min = 2000;
          filters.price_max = 3500;
        } else if (priceRange === '25-50') {
          filters.price_min = 3500;
          filters.price_max = 7000;
        } else if (priceRange === 'over-50') {
          filters.price_min = 7000;
        }
      }

      // Filter by visibility (only show public content by default)
      if (visibility === 'all') {
        filters.visibility = 'public';
      } else if (visibility !== 'any') {
        filters.visibility = visibility;
      }

      // Map sortBy to edge function sort_by
      let sort_by = 'relevance';
      switch (sortBy) {
        case 'price-low':
          sort_by = 'price';
          break;
        case 'price-high':
          sort_by = 'price';
          break;
        case 'rating':
          sort_by = 'rating';
          break;
        case 'newest':
          sort_by = 'newest';
          break;
        default:
          sort_by = 'relevance';
      }

      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Get Supabase URL from the client
        const supabaseUrl = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
        
        if (!supabaseUrl) {
          throw new Error('Supabase URL is not configured');
        }

        // Construct the edge function URL
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/content-search`;
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add authorization header if user is logged in
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: searchQuery,
            filters,
            sort_by,
            page,
            page_size: 40,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Edge function error response:', errorText);
          throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }

        const result = await res.json();
        setContent(result.data || []);
        setTotalPages(result.total_pages || 1);
        setTotalResults(result.total || 0);
      } catch (e) {
        console.error('Failed to fetch content:', e);
        setError(e instanceof Error ? e.message : 'Failed to fetch content');
        setContent([]);
        setTotalPages(1);
        setTotalResults(0);
      }
      
      setLoading(false);
    };
    
    fetchContent();
  }, [searchQuery, selectedCategories, selectedContentTypes, sortBy, priceRange, visibility, page]);

  const handleAddToCart = async (contentId: string, quantity: number = 1) => {
    try {
      setAddingToCart(contentId);

      // Find the content item to pass as a book object
      const contentItem = content.find(c => c.id === contentId);
      if (!contentItem) {
        throw new Error('Content not found');
      }

      // Create a book object for CartContext
      const book = {
        id: contentItem.id,
        title: contentItem.title || 'Untitled',
        author: contentItem.author,
        price: contentItem.price ?? 0,
      };

      // Use CartContext which handles edge function calls
      await addToCartContext(book, quantity);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      // Error handling is done in CartContext
    } finally {
      setAddingToCart(null);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    setPage(1);
  };

  const toggleContentType = (contentType: string) => {
    setSelectedContentTypes(prev =>
      prev.includes(contentType)
        ? prev.filter(c => c !== contentType)
        : [...prev, contentType]
    );
    setPage(1);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedContentTypes([]);
    setPriceRange('all');
    setVisibility('all');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = 
    selectedCategories.length > 0 || 
    selectedContentTypes.length > 0 || 
    priceRange !== 'all' || 
    visibility !== 'all' || 
    searchQuery !== '';

  const sortedContent = content;

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Content Types */}
      <div>
        <h3 className="font-semibold mb-4 text-foreground">Content Type</h3>
        <div className="space-y-3">
          {CONTENT_TYPES.map(type => (
            <label
              key={type.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={selectedContentTypes.includes(type.value)}
                onCheckedChange={() => toggleContentType(type.value)}
              />
              <span className="text-sm group-hover:text-primary transition-colors">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-4 text-foreground">Categories</h3>
        <div className="space-y-3">
          {categories.map(category => (
            <label
              key={category.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={selectedCategories.includes(category.slug)}
                onCheckedChange={() => toggleCategory(category.slug)}
              />
              <span className="text-sm group-hover:text-primary transition-colors">
                {category.name}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                ({category.bookCount})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-4 text-foreground">Price Range</h3>
        <div className="space-y-3">
          {[
            { value: 'all', label: 'All Prices' },
            { value: 'free', label: 'Free' },
            { value: 'under-15', label: 'Under Ksh 2,000' },
            { value: '15-25', label: 'Ksh 2,000 - Ksh 3,500' },
            { value: '25-50', label: 'Ksh 3,500 - Ksh 7,000' },
            { value: 'over-50', label: 'Over Ksh 7,000' },
          ].map(range => (
            <label
              key={range.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={priceRange === range.value}
                onCheckedChange={() => {
                  setPriceRange(range.value);
                  setPage(1);
                }}
              />
              <span className="text-sm group-hover:text-primary transition-colors">
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          className="w-full"
          onClick={clearAllFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-muted/30 border-b">
        <div className="container py-8 md:py-12">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            <span className="text-foreground">Content Library</span>
          </nav>
          <h1 className="headline-2 mb-2">
            Browse Our Content Library
          </h1>
          <p className="body-2 text-muted-foreground">
            {loading ? (
              'Loading content...'
            ) : error ? (
              <span className="text-destructive">Error loading content</span>
            ) : (
              <>
                Discover {totalResults > 0 ? `${totalResults}+` : '0'} books, documents, papers, and more
              </>
            )}
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </h2>
              </div>
              <FilterSidebar />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content, authors, titles, ISBN..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value) => {
                setSortBy(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                        {selectedCategories.length + selectedContentTypes.length + (priceRange !== 'all' ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-6">
                {searchQuery && (
                  <Badge variant="secondary" className="gap-2">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPage(1);
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedContentTypes.map(type => {
                  const contentType = CONTENT_TYPES.find(ct => ct.value === type);
                  return (
                    <Badge key={type} variant="secondary" className="gap-2">
                      {contentType?.label}
                      <button
                        onClick={() => toggleContentType(type)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {selectedCategories.map(category => {
                  const cat = categories.find(c => c.slug === category);
                  return (
                    <Badge key={category} variant="secondary" className="gap-2">
                      {cat?.name}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {priceRange !== 'all' && (
                  <Badge variant="secondary" className="gap-2">
                    {priceRange === 'free' && 'Free'}
                    {priceRange === 'under-15' && 'Under Ksh 2,000'}
                    {priceRange === '15-25' && 'Ksh 2,000 - Ksh 3,500'}
                    {priceRange === '25-50' && 'Ksh 3,500 - Ksh 7,000'}
                    {priceRange === 'over-50' && 'Over Ksh 7,000'}
                    <button
                      onClick={() => {
                        setPriceRange('all');
                        setPage(1);
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-destructive font-medium mb-2">Failed to load content</p>
                <p className="text-xs text-muted-foreground mb-3">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Results Count */}
            {!loading && !error && sortedContent.length > 0 && (
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {((page - 1) * 40) + 1} - {Math.min(page * 40, totalResults)} of {totalResults} results
              </div>
            )}

            {/* Content Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <span className="text-muted-foreground">Loading content...</span>
                </div>
              </div>
            ) : sortedContent.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {sortedContent.map((item, index) => {
                    const book = {
                      id: item.id,
                      title: item.title || 'Untitled',
                      author: item.author || 'Unknown Author',
                      publisher: item.publisher || '',
                      price: item.price ?? 0,
                      originalPrice: undefined,
                      description: item.description || '',
                      synopsis: item.description || '',
                      category: item.category_id || '',
                      coverImage: item.cover_image_url || '/placeholder-book-cover.png',
                      backCoverImage: undefined,
                      previewImages: undefined,
                      stock: item.stock_quantity ?? 0,
                      rating: item.average_rating ?? 0,
                      reviewCount: item.total_reviews ?? 0,
                      isbn: item.isbn || '',
                      publicationDate: item.published_date || item.published_at || '',
                      pages: item.page_count ?? 0,
                      language: item.language || 'en',
                      featured: item.is_featured ?? false,
                      bestseller: item.is_bestseller ?? false,
                      format: item.format || 'pdf',
                      version: item.version || '1.0',
                      contentType: item.content_type || 'book',
                      visibility: item.visibility || 'public',
                      status: item.status || 'published',
                      isFree: item.is_free ?? false,
                      isForSale: item.is_for_sale ?? true,
                      fileUrl: item.file_url || '',
                      fileSizeBytes: item.file_size_bytes || 0,
                      subtitle: item.subtitle || '',
                      department: item.department || '',
                      documentNumber: item.document_number || '',
                      confidentiality: item.confidentiality || '',
                    };
                    
                    return (
                      <div
                        key={book.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <BookCard 
                          book={book} 
                          onAddToCart={handleAddToCart}
                          isAddingToCart={addingToCart === book.id}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 pt-8 border-t">
                    <div className="flex items-center gap-2">
                      <Button 
                        disabled={page === 1} 
                        onClick={() => {
                          setPage(page - 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {page > 3 && (
                          <>
                            <Button
                              variant={page === 1 ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => {
                                setPage(1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              1
                            </Button>
                            {page > 4 && <span className="px-2">...</span>}
                          </>
                        )}
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                          if (pageNum <= totalPages) {
                            return (
                              <Button
                                key={pageNum}
                                variant={page === pageNum ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                  setPage(pageNum);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                          return null;
                        })}
                        
                        {page < totalPages - 2 && (
                          <>
                            {page < totalPages - 3 && <span className="px-2">...</span>}
                            <Button
                              variant={page === totalPages ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => {
                                setPage(totalPages);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Button 
                        disabled={page === totalPages} 
                        onClick={() => {
                          setPage(page + 1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                    
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="mb-4">
                  <Search className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">
                    No content found matching your criteria
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Try adjusting your filters or search query
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Books;