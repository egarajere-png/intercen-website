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
}

export const BookCard = ({ book, variant = 'default' }: BookCardProps) => {
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
      <Link to={`/books/${book.id}`} className="group block">
        <div className="book-card p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="relative w-full md:w-48 shrink-0">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              {book.bestseller && (
                <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
                  Bestseller
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
            <h3 className="font-forum text-xl md:text-2xl mb-2 group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              <p className="text-muted-foreground mb-2">by {book.author}</p>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-medium">{book.rating}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  ({book.reviewCount.toLocaleString()} reviews)
                </span>
              </div>

              <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                {book.description}
              </p>

              <div className="flex items-center justify-between mt-auto">
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
                <Button onClick={handleAddToCart} className="gap-2">
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

  return (
    <Link to={`/books/${book.id}`} className="group block">
      <div className="book-card">
        {/* Image Container */}
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {book.bestseller && (
              <Badge className="bg-secondary text-secondary-foreground text-xs">
                Bestseller
              </Badge>
            )}
            {book.originalPrice && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                Sale
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/90 hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Add to Cart Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              onClick={handleAddToCart}
              className="w-full gap-2" 
              size="sm"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-xs font-medium">{book.rating}</span>
            <span className="text-xs text-muted-foreground">
              ({book.reviewCount.toLocaleString()})
            </span>
          </div>

          <h3 className="font-forum text-base leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          
          <p className="text-muted-foreground text-sm mb-3">
            {book.author}
          </p>

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">
              Ksh {book.price.toFixed(2)}
            </span>
            {book.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                Ksh {book.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
