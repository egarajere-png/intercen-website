import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { Book } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { isAuthenticated } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface BookCardProps {
  book: Book;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}
// ... imports remain the same ...

export const BookCard = ({ 
  book, 
  variant = 'default',
  className = '' 
}: BookCardProps) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated()) {
      toast.error('You must be logged in to add items to your cart.');
      navigate('/auth');
      return;
    }
    addToCart(book);
  };

  if (variant === 'featured') {
    return (
      <Link to={`/books/${book.id}`} className={`group block ${className}`}>
        <div className="book-card h-full p-6 md:p-8 border border-border rounded-2xl bg-card hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Image */}
            <div className="relative w-full lg:w-56 shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400";
                  }}
                />
              </div>
              {book.bestseller && (
                <Badge className="absolute top-3 left-3 bg-amber-500 text-white">
                  Bestseller
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="font-forum text-xl md:text-2xl leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {book.title}
              </h3>

              <p className="text-muted-foreground text-sm mb-3 line-clamp-1">
                by {book.author}
              </p>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-medium">{book.rating}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  ({book.reviewCount.toLocaleString()} reviews)
                </span>
              </div>

              {/* FIXED DESCRIPTION - This was the main culprit */}
              <p className="text-muted-foreground text-[15px] leading-relaxed line-clamp-4 mb-6 flex-1">
                {book.synopsis || book.description || "No description available."}
              </p>

              {/* Price & Button pinned at bottom */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    Ksh {book.price.toFixed(2)}
                  </span>
                  {book.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      Ksh {book.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <Button 
                  onClick={handleAddToCart} 
                  className="gap-2 whitespace-nowrap"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant (you can keep your existing one or use the previous improved version)
  return (
    <Link to={`/books/${book.id}`} className={`group block ${className}`}>
      {/* Your existing default card code here */}
      {/* ... */}
    </Link>
  );
};

export default BookCard;