import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { BookCard } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
// ...removed getBestsellers import...

export const BestsellerSection = () => {
  // ...removed usage of getBestsellers...

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="section-subtitle section-subtitle-left">Trending</p>
              <h2 className="headline-2">
                Bestsellers
              </h2>
              <p className="body-2 text-muted-foreground mt-1">
                Top-selling books this month
              </p>
            </div>
          </div>
          <Link to="/books?filter=bestseller">
            <Button variant="outline" className="gap-2">
              View All Bestsellers
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Featured Bestseller */}
        <div className="mb-8">
          {bestsellers[0] && (
            <BookCard book={bestsellers[0]} variant="featured" />
          )}
        </div>

        {/* More Bestsellers */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {bestsellers.slice(1, 5).map((book, index) => (
            <div 
              key={book.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <BookCard book={book} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
