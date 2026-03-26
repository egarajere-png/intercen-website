import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BookCard } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Book } from '@/types/book';

const FeaturedBooks = () => {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedBooks = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(9);

      if (!error && data) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          author: item.author || '',
          publisher: item.publisher || '',
          price: item.price ?? 0,
          originalPrice: item.original_price ?? undefined,
          description: item.description || '',
          synopsis: item.synopsis || '',
          category: item.category_id || '',
          coverImage: item.cover_image_url || '',
          backCoverImage: item.back_cover_image_url || '',
          previewImages: item.preview_images || [],
          stock: item.stock_quantity ?? 0,
          rating: item.average_rating ?? 0,
          reviewCount: item.total_reviews ?? 0,
          isbn: item.isbn || '',
          publicationDate: item.published_date || '',
          pages: item.page_count ?? undefined,
          language: item.language || '',
          featured: item.is_featured ?? false,
          bestseller: item.is_bestseller ?? false,
        })) as Book[];

        setFeaturedBooks(mapped);
      } else {
        setFeaturedBooks([]);
      }

      setLoading(false);
    };

    fetchFeaturedBooks();
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (!loading && featuredBooks.length > 1) {
      let timeoutId: NodeJS.Timeout;
      let intervalId: NodeJS.Timeout;
      let isUnmounted = false;

      const startCycle = () => {
        intervalId = setInterval(() => {
          setFade(false);
          timeoutId = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredBooks.length);
            setFade(true);
          }, 1200); // fade out duration (longer for smoothness)
        }, 16200); // 15s display + 1.2s fade out/in buffer
      };

      startCycle();

      return () => {
        isUnmounted = true;
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [loading, featuredBooks]);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-lg">
            <p className="section-subtitle section-subtitle-left text-primary">
              Curated Selection
            </p>
            <h2 className="headline-2 mt-2">Featured Books</h2>
            <p className="body-2 text-muted-foreground mt-3">
              Hand-picked selections from our editors — stories worth your time.
            </p>
          </div>

          <Link to="/books">
            <Button variant="outline" className="gap-2 group whitespace-nowrap">
              View All Books
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>

        {/* Single Book with Fade Transition */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading featured books…</p>
          </div>
        ) : featuredBooks.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No featured books available at the moment.
          </div>
        ) : (
          <div className="w-full flex items-center min-h-[400px]">
            <div
              key={featuredBooks[currentIndex]?.id}
              className={`w-full transition-opacity duration-[1200ms] ${fade ? 'opacity-100' : 'opacity-0'}`}
            >
              <BookCard
                book={featuredBooks[currentIndex]}
                variant="featured"
                className="w-full h-full transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedBooks;