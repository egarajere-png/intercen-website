import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Eye, Download, CheckCircle2 } from 'lucide-react';
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
  /** True when the currently-logged-in user already owns this book */
  isPurchased?: boolean;
  /** Called when the user clicks Add to Cart (not passed for owned books) */
  onAddToCart?: (id: string, quantity?: number) => void;
  /** Called when the user clicks Download (passed only for owned books) */
  onDownload?: (id: string) => void;
  isAddingToCart?: boolean;
}

export const BookCard = ({
  book,
  variant = 'default',
  className = '',
  isPurchased = false,
  onAddToCart,
  onDownload,
  isAddingToCart = false,
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
    if (onAddToCart) {
      onAddToCart(book.id, 1);
    } else {
      addToCart(book);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDownload) {
      onDownload(book.id);
    } else if ((book as any).fileUrl) {
      window.open((book as any).fileUrl, '_blank');
    }
  };

  // ── Featured variant ──────────────────────────────────────────────────────
  if (variant === 'featured') {
    return (
      <Link to={`/books/${book.id}`} className={`group block ${className}`}>
        <div className="book-card h-full p-6 md:p-8 border border-border rounded-2xl bg-card hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Cover */}
            <div className="relative w-full lg:w-56 shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted">
                <img
                  src={book.coverImage || '/placeholder-book-cover.png'}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'; }}
                />
              </div>
              {book.bestseller && (
                <Badge className="absolute top-3 left-3 bg-amber-500 text-white">Bestseller</Badge>
              )}
              {isPurchased && (
                <div className="absolute top-3 right-3 bg-emerald-600 text-white rounded-full p-1 shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col min-h-0">
              {isPurchased && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  You own this book
                </div>
              )}
              <h3 className="font-forum text-xl md:text-2xl leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-1">by {book.author}</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-medium">{(book.rating ?? 0).toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  ({(book.reviewCount ?? 0).toLocaleString()} reviews)
                </span>
              </div>
              <p className="text-muted-foreground text-[15px] leading-relaxed line-clamp-4 mb-6 flex-1">
                {book.synopsis || book.description || 'No description available.'}
              </p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                <div>
                  {isPurchased ? (
                    <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Purchased
                    </span>
                  ) : book.isFree ? (
                    <span className="text-2xl font-bold text-emerald-600">Free</span>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">Ksh {(book.price ?? 0).toLocaleString()}</span>
                      {book.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">Ksh {book.originalPrice.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>

                {isPurchased ? (
                  <Button onClick={handleDownload} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Download className="h-4 w-4" /> Download
                  </Button>
                ) : (
                  <Button onClick={handleAddToCart} disabled={isAddingToCart} className="gap-2 whitespace-nowrap">
                    <ShoppingCart className="h-4 w-4" />
                    {isAddingToCart ? 'Adding…' : 'Add to Cart'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Compact variant ───────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <Link to={`/books/${book.id}`} className={`group flex gap-3 ${className}`}>
        <div className="w-12 h-16 rounded-md overflow-hidden shrink-0 bg-muted relative">
          <img
            src={book.coverImage || '/placeholder-book-cover.png'}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'; }}
          />
          {isPurchased && (
            <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{book.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{book.author}</p>
          <p className="text-sm font-semibold mt-1">
            {isPurchased ? (
              <span className="text-emerald-600 flex items-center gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Owned
              </span>
            ) : book.isFree ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              <span className="text-primary">Ksh {(book.price ?? 0).toLocaleString()}</span>
            )}
          </p>
        </div>
      </Link>
    );
  }

  // ── Default variant ───────────────────────────────────────────────────────
  return (
    <Link to={`/books/${book.id}`} className={`group block ${className}`}>
      <div
        className={`rounded-xl border bg-card overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1 ${
          isPurchased
            ? 'border-emerald-300 hover:shadow-emerald-100 hover:shadow-lg'
            : 'border-border hover:shadow-lg'
        }`}
      >
        {/* Cover */}
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <img
            src={book.coverImage || '/placeholder-book-cover.png'}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'; }}
          />

          {/* ── Owned ribbon — most prominent indicator ── */}
          {isPurchased && (
            <div className="absolute top-0 left-0 right-0 bg-emerald-600 text-white text-[11px] font-bold text-center py-1 flex items-center justify-center gap-1 z-10">
              <CheckCircle2 className="h-3 w-3" /> You Own This
            </div>
          )}

          {/* Other badges */}
          {!isPurchased && (
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {book.featured && (
                <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">Featured</Badge>
              )}
              {book.bestseller && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white">Bestseller</Badge>
              )}
              {book.isFree && (
                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white">Free</Badge>
              )}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="flex items-center gap-1.5 text-white text-sm font-medium">
              {isPurchased ? (
                <><Download className="h-4 w-4" /> Download</>
              ) : (
                <><Eye className="h-4 w-4" /> View Details</>
              )}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {book.author || 'Unknown Author'}
          </p>

          {(book.rating ?? 0) > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.round(book.rating ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">({book.reviewCount ?? 0})</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Price + action button */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border">
            <div className="flex items-baseline gap-1">
              {isPurchased ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Owned
                </span>
              ) : book.isFree ? (
                <span className="text-sm font-bold text-emerald-600">Free</span>
              ) : (
                <>
                  <span className="text-sm font-bold text-primary">Ksh {(book.price ?? 0).toLocaleString()}</span>
                  {book.originalPrice && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      Ksh {book.originalPrice.toLocaleString()}
                    </span>
                  )}
                </>
              )}
            </div>

            {isPurchased ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 shrink-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={handleDownload}
                title="Download your copy"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 shrink-0 hover:bg-primary hover:text-primary-foreground"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                title="Add to cart"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BookCard;