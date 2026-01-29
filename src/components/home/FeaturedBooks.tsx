import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BookCard } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
// ...removed getFeaturedBooks import...

export const FeaturedBooks = () => {
  // ...removed usage of getFeaturedBooks...

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="section-subtitle section-subtitle-left">Featured</p>
            <h2 className="headline-2">
              Featured Books
            </h2>
            <p className="body-2 text-muted-foreground mt-2">
              Hand-picked selections from our editors
            </p>
          </div>
          <Link to="/books">
            <Button variant="outline" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {featuredBooks.slice(0, 4).map((book, index) => (
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
