import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BookCard } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { getFeaturedBooks } from '@/data/mockBooks';

export const FeaturedBooks = () => {
  const featuredBooks = getFeaturedBooks();

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              Featured Books
            </h2>
            <p className="text-muted-foreground text-lg">
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
