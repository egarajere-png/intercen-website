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
import { categories } from '@/data/mockBooks';
import { Content } from '@/types/content.types';

const Books = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [books, setBooks] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      
      // Build filters for edge function
      let filters: any = {};
      
      if (selectedCategories.length === 1) {
        const cat = categories.find(c => c.slug === selectedCategories[0]);
        if (cat) filters.category_id = cat.id;
      }
      
      if (priceRange !== 'all') {
        if (priceRange === 'under-15') filters.price_max = 15;
        if (priceRange === '15-25') {
          filters.price_min = 15;
          filters.price_max = 25;
        }
        if (priceRange === '25-50') {
          filters.price_min = 25;
          filters.price_max = 50;
        }
        if (priceRange === 'over-50') filters.price_min = 50;
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
        const res = await fetch('/functions/v1/content-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            filters,
            sort_by,
            page,
            page_size: 40,
          }),
        });
        const result = await res.json();
        setBooks(result.data || []);
        setTotalPages(result.total_pages || 1);
        setTotalResults(result.total || 0);
      } catch (e) {
        console.error('Failed to fetch content:', e);
        setBooks([]);
        setTotalPages(1);
        setTotalResults(0);
      }
      
      setLoading(false);
    };
    
    fetchContent();
  }, [searchQuery, selectedCategories, sortBy, priceRange, page]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    setPage(1); // Reset to first page when filter changes
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange('all');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = selectedCategories.length > 0 || priceRange !== 'all' || searchQuery !== '';

  // No frontend filtering/sorting; all handled by edge function
  const sortedBooks = books;

  const FilterSidebar = () => (
    <div className="space-y-6">
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
            { value: 'under-15', label: 'Under $15' },
            { value: '15-25', label: '$15 - $25' },
            { value: '25-50', label: '$25 - $50' },
            { value: 'over-50', label: 'Over $50' },
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
            <span className="text-foreground">Books</span>
          </nav>
          <h1 className="headline-2 mb-2">
            Browse Our Collection
          </h1>
          <p className="body-2 text-muted-foreground">
            {loading ? (
              'Loading content...'
            ) : (
              <>
                Discover {totalResults > 0 ? `${totalResults}+` : '0'} items across all content types
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
                  placeholder="Search books, authors, ISBN..."
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
                        {selectedCategories.length + (priceRange !== 'all' ? 1 : 0)}
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
                    {priceRange === 'under-15' && 'Under $15'}
                    {priceRange === '15-25' && '$15 - $25'}
                    {priceRange === '25-50' && '$25 - $50'}
                    {priceRange === 'over-50' && 'Over $50'}
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

            {/* Results Count */}
            {!loading && sortedBooks.length > 0 && (
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {((page - 1) * 40) + 1} - {Math.min(page * 40, totalResults)} of {totalResults} results
              </div>
            )}

            {/* Books Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <span className="text-muted-foreground">Loading content...</span>
                </div>
              </div>
            ) : sortedBooks.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {sortedBooks.map((item, index) => {
                    // Map Content to Book shape for BookCard with accurate data from upload/update structure
                    const book = {
                      id: item.id,
                      title: item.title || 'Untitled',
                      author: item.author || 'Unknown Author',
                      publisher: item.publisher || '',
                      price: item.price ?? 0,
                      originalPrice: undefined,
                      description: item.description || '',
                      synopsis: item.description || '', // Use description as synopsis fallback
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
                      // Additional fields from content structure
                      format: item.format || 'pdf',
                      version: item.version || '1.0',
                      contentType: item.content_type || 'book',
                      visibility: item.visibility || 'public',
                      status: item.status || 'published',
                      isFree: item.is_free ?? false,
                      isForSale: item.is_for_sale ?? true,
                      fileUrl: item.file_url || '',
                      fileSizeBytes: item.file_size_bytes || 0,
                    };
                    
                    return (
                      <div
                        key={book.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <BookCard book={book} />
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
                        {/* Show first page */}
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
                        
                        {/* Show pages around current page */}
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
                        
                        {/* Show last page */}
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
                    No books found matching your criteria
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