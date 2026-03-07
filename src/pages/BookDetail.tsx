import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Share2, Minus, Plus, Loader2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Seo } from '@/components/Seo';
import BookCard from '../components/books/BookCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';
import { supabase } from '../lib/SupabaseClient';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContentItem {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  content_type: string;
  format?: string | null;
  author?: string | null;
  publisher?: string | null;
  published_date?: string | null;
  category_id?: string | null;
  language: string;
  cover_image_url?: string | null;
  backpage_image_url?: string | null;
  file_url?: string | null;
  file_size_bytes?: number | null;
  page_count?: number | null;
  price: number;
  is_free: boolean;
  is_for_sale: boolean;
  stock_quantity: number;
  quantity: number;
  isbn?: string | null;

  // Feature flags
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;

  // Metrics
  average_rating: number;
  total_reviews: number;
  total_downloads: number;
  view_count: number;

  // Access control
  visibility: string;
  access_level: string;
  document_number?: string | null;
  version: string;
  department?: string | null;
  confidentiality?: string | null;
  status: string;
  uploaded_by?: string | null;
  organization_id?: string | null;

  // Metadata
  meta_keywords?: string[] | null;
  search_vector?: any;

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string | null;

  // Relational
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    parent_id?: string | null;
    icon_url?: string | null;
    is_active: boolean;
    sort_order: number;
  };

  // Computed
  original_price?: number;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400";

// ─── Component ────────────────────────────────────────────────────────────────
const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [book, setBook] = useState<ContentItem | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch book details ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchBookDetails = async () => {
      if (!id) {
        setError('No book ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Main content item
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select('*')
          .eq('id', id)
          .eq('status', 'published')
          .eq('visibility', 'public')
          .single();

        if (contentError || !contentData) {
          setError('Book not found');
          setLoading(false);
          return;
        }

        // Category for main item
        let category: ContentItem['category'] | undefined;
        if (contentData.category_id) {
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, slug')
            .eq('id', contentData.category_id)
            .single();
          if (!categoryError && categoryData) {
            category = categoryData;
          }
        }

        const enrichedBook: ContentItem = { ...contentData, category };
        setBook(enrichedBook);

        // Related books (same category)
        if (contentData.category_id) {
          const { data: relatedData, error: relatedError } = await supabase
            .from('content')
            .select('*')
            .eq('category_id', contentData.category_id)
            .eq('status', 'published')
            .eq('visibility', 'public')
            .eq('is_for_sale', true)
            .neq('id', id)
            .limit(4);

          if (!relatedError && relatedData) {
            const relatedWithCategory: ContentItem[] = await Promise.all(
              relatedData.map(async (item) => {
                let relCategory: ContentItem['category'] | undefined;
                if (item.category_id) {
                  const { data: relCatData, error: relCatError } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .eq('id', item.category_id)
                    .single();
                  if (!relCatError && relCatData) {
                    relCategory = relCatData;
                  }
                }

                const enrichedItem: ContentItem = {
                  ...item,
                  category: relCategory,
                  cover_image_url:
                    item.cover_image_url && item.cover_image_url.trim() !== ''
                      ? item.cover_image_url
                      : FALLBACK_IMAGE,
                };
                return enrichedItem;
              })
            );
            setRelatedBooks(relatedWithCategory);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [id]);

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !book) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Book Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || "The book you're looking for doesn't exist."}
          </p>
          <Button onClick={() => navigate('/shop')}>Return to Shop</Button>
        </div>
      </Layout>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const images = [
    book.cover_image_url || FALLBACK_IMAGE,
    ...(book.backpage_image_url && book.backpage_image_url !== book.cover_image_url
      ? [book.backpage_image_url]
      : []),
  ];

  const bookTitle = book.title || 'Book Detail';
  const bookDescription = book.description || 'Read more about this book on Intercen Books.';
  const canonicalUrl = `https://www.intercenbooks.com/books/${book.id}`;

  // ── JSON-LD structured data for SEO ────────────────────────────────────────
  const bookJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: bookTitle,
    description: bookDescription,
    url: canonicalUrl,
    image: book.cover_image_url || FALLBACK_IMAGE,
    ...(book.author ? { author: { '@type': 'Person', name: book.author } } : {}),
    ...(book.publisher ? { publisher: { '@type': 'Organization', name: book.publisher } } : {}),
    ...(book.isbn ? { isbn: book.isbn } : {}),
    ...(book.published_date ? { datePublished: book.published_date } : {}),
    ...(book.page_count ? { numberOfPages: book.page_count } : {}),
    ...(book.language ? { inLanguage: book.language } : {}),
    ...(book.average_rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: book.average_rating.toFixed(1),
            reviewCount: book.total_reviews,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: book.is_free ? '0' : book.price.toFixed(2),
      priceCurrency: 'KES',
      availability:
        book.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
    },
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (book.stock_quantity === 0) {
      toast.error('This item is out of stock');
      return;
    }
    if (!book.is_for_sale) {
      toast.error('This item is not available for purchase');
      return;
    }
    addToCart(
      {
        id: book.id,
        title: book.title,
        author: book.author || 'Unknown Author',
        price: book.price,
        image: book.cover_image_url || images[0],
        category: book.category?.name || book.content_type,
        stock: book.stock_quantity,
      },
      quantity
    );
    toast.success(`Added ${quantity} × ${book.title} to cart`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: book.description || `Check out ${book.title} by ${book.author}`,
          url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <Seo
        title={`${bookTitle} | Intercen Books`}
        description={bookDescription}
        canonical={canonicalUrl}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />

      <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 flex-wrap">
          <button onClick={() => navigate('/')} className="hover:text-foreground">Home</button>
          <span>/</span>
          <button onClick={() => navigate('/shop')} className="hover:text-foreground">Shop</button>
          <span>/</span>
          {book.category && (
            <>
              <button
                onClick={() => navigate(`/shop?category=${book.category?.slug}`)}
                className="hover:text-foreground"
              >
                {book.category.name}
              </button>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{book.title}</span>
        </div>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

          {/* ── Image Gallery ── */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-card">
              <img
                src={images[selectedImage]}
                alt={selectedImage === 0 ? book.title : `${book.title} - Back Page`}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
              />

              {selectedImage === 1 && book.backpage_image_url && (
                <div className="absolute top-4 right-4 bg-white/90 text-xs font-semibold px-3 py-1 rounded-full shadow text-gray-700">
                  Back Page
                </div>
              )}

              {book.is_bestseller && (
                <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground">
                  Bestseller
                </Badge>
              )}
              {book.is_featured && (
                <Badge
                  className="absolute top-4 left-4 bg-amber-500 text-white"
                  style={{ marginTop: book.is_bestseller ? '40px' : '0' }}
                >
                  Featured
                </Badge>
              )}
              {book.is_new_arrival && (
                <Badge
                  className="absolute top-4 left-4 bg-blue-500 text-white"
                  style={{ marginTop: (book.is_bestseller || book.is_featured) ? '40px' : '0' }}
                >
                  New Arrival
                </Badge>
              )}
              {book.is_free && (
                <Badge className="absolute bottom-4 left-4 bg-green-500 text-white">
                  Free
                </Badge>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-20 h-28 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                    aria-label={idx === 0 ? 'Cover Image' : 'Back Page Image'}
                  >
                    <img
                      src={img}
                      alt={idx === 0 ? book.title : `${book.title} - Back Page`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                    {idx === 1 && book.backpage_image_url && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                        Back
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Book Details ── */}
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground mb-2">
                {book.category?.name || book.content_type}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">{book.title}</h1>
              {book.subtitle && (
                <p className="text-xl text-muted-foreground mb-2">{book.subtitle}</p>
              )}
              <p className="text-lg text-muted-foreground">
                by {book.author || 'Unknown Author'}
              </p>
            </div>

            {/* Rating */}
            {book.average_rating > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(book.average_rating)
                          ? 'fill-primary text-primary'
                          : 'fill-muted text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{book.average_rating.toFixed(1)}</span>
                {book.total_reviews > 0 && (
                  <span className="text-muted-foreground">
                    ({book.total_reviews.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              {book.is_free ? (
                <span className="text-4xl font-bold text-green-600">FREE</span>
              ) : (
                <span className="text-4xl font-bold text-primary">
                  KSH {book.price.toFixed(2)}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm text-muted-foreground">
              {book.view_count > 0 && (
                <div>
                  <span className="font-medium text-foreground">
                    {book.view_count.toLocaleString()}
                  </span>{' '}
                  views
                </div>
              )}
              {book.total_downloads > 0 && (
                <div>
                  <span className="font-medium text-foreground">
                    {book.total_downloads.toLocaleString()}
                  </span>{' '}
                  downloads
                </div>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {book.is_for_sale && (
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div className="flex items-center border rounded-lg w-full sm:w-auto justify-between sm:justify-start">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.min(book.stock_quantity, quantity + 1))}
                    disabled={quantity >= book.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1 gap-2 min-w-[150px]"
                  onClick={handleAddToCart}
                  disabled={book.stock_quantity === 0 || !book.is_for_sale}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {book.is_free ? 'Get Free Copy' : 'Add to Cart'}
                </Button>

                <div className="flex flex-row gap-2 mt-2 sm:mt-0">
                  <Button variant="outline" size="lg" className="w-12 px-0">
                    <Heart className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="lg" className="w-12 px-0" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Download button for free items */}
            {book.is_free && book.access_level === 'free' && book.file_url && (
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 mt-2"
                onClick={() => window.open(book.file_url!, '_blank')}
              >
                Download Now
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="mt-10 sm:mt-12">
          <Tabs defaultValue="synopsis">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-8">
              <TabsTrigger
                value="synopsis"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-3"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-3"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-3"
              >
                Reviews ({book.total_reviews || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="synopsis" className="pt-6">
              <div className="prose prose-gray max-w-3xl">
                {book.description ? (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {book.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No description available for this item.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="pt-6">
              <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
                {book.author && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Author</span>
                    <span className="font-medium">{book.author}</span>
                  </div>
                )}
                {book.publisher && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Publisher</span>
                    <span className="font-medium">{book.publisher}</span>
                  </div>
                )}
                {book.page_count && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Pages</span>
                    <span className="font-medium">{book.page_count}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-medium">{book.language.toUpperCase()}</span>
                </div>
                {book.format && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Format</span>
                    <span className="font-medium">{book.format.toUpperCase()}</span>
                  </div>
                )}
                {book.category && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{book.category.name}</span>
                  </div>
                )}
                {book.published_date && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Published</span>
                    <span className="font-medium">
                      {new Date(book.published_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {book.isbn && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">ISBN</span>
                    <span className="font-medium">{book.isbn}</span>
                  </div>
                )}
                {book.file_size_bytes && (
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">File Size</span>
                    <span className="font-medium">
                      {(book.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">{book.version}</span>
                </div>
              </div>

              {book.meta_keywords && book.meta_keywords.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {book.meta_keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="pt-6">
              <div className="space-y-8">
                <ReviewForm contentId={book.id} onSuccess={() => window.location.reload()} />
                <ReviewList contentId={book.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Related Books ── */}
        {relatedBooks.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">
              You May Also Like
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedBooks.map(relatedBook => (
                <BookCard
                  key={relatedBook.id}
                  book={{
                    id: relatedBook.id,
                    title: relatedBook.title,
                    author: relatedBook.author || 'Unknown Author',
                    price: relatedBook.price,
                    rating: relatedBook.average_rating,
                    reviewCount: relatedBook.total_reviews,
                    image: relatedBook.cover_image_url || FALLBACK_IMAGE,
                    category: relatedBook.category?.name || relatedBook.content_type,
                    stock: relatedBook.stock_quantity,
                    bestseller: relatedBook.is_bestseller,
                  }}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default BookDetail;