import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronDown, 
  Star, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Truck, 
  Shield, 
  RotateCcw,
  Minus,
  Plus
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/contexts/CartContext';
import { getBookById, mockBooks } from '@/data/mockBooks';
import { BookCard } from '@/components/books/BookCard';

const BookDetail = () => {
  const { id } = useParams();
  const book = getBookById(id || '');
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  if (!book) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="font-serif text-3xl font-bold mb-4">Book Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The book you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/books">
            <Button>Browse All Books</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const images = [book.coverImage, book.backCoverImage || book.coverImage];
  const relatedBooks = mockBooks.filter(b => b.category === book.category && b.id !== book.id).slice(0, 4);

  const handleAddToCart = () => {
    addToCart(book, quantity);
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            <Link to="/books" className="hover:text-primary">Books</Link>
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            <Link to={`/books?category=${book.category.toLowerCase()}`} className="hover:text-primary">
              {book.category}
            </Link>
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            <span className="text-foreground truncate max-w-[200px]">{book.title}</span>
          </nav>
        </div>
      </div>

      <div className="container py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-card">
              <img
                src={images[selectedImage]}
                alt={book.title}
                className="w-full h-full object-cover"
              />
              {book.bestseller && (
                <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground">
                  Bestseller
                </Badge>
              )}
              {book.originalPrice && (
                <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                  {Math.round((1 - book.price / book.originalPrice) * 100)}% Off
                </Badge>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-28 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === idx ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Book Details */}
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground mb-2">{book.category}</p>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3">
                {book.title}
              </h1>
              <p className="text-lg text-muted-foreground">by {book.author}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(book.rating)
                        ? 'fill-primary text-primary'
                        : 'fill-muted text-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium">{book.rating}</span>
              <span className="text-muted-foreground">
                ({book.reviewCount.toLocaleString()} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-primary">
                ${book.price.toFixed(2)}
              </span>
              {book.originalPrice && (
                <span className="text-xl text-muted-foreground line-through">
                  ${book.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {book.description}
            </p>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {book.stock > 0 ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-600 font-medium">
                    In Stock ({book.stock} available)
                  </span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="text-sm text-destructive font-medium">Out of Stock</span>
                </>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center border rounded-lg">
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
                  onClick={() => setQuantity(Math.min(book.stock, quantity + 1))}
                  disabled={quantity >= book.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                variant="hero" 
                size="lg" 
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={book.stock === 0}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>

              <Button variant="outline" size="lg" className="w-12 px-0">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="w-12 px-0">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-medium">Free Delivery</p>
                <p className="text-xs text-muted-foreground">Over KES 2,000</p>
              </div>
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-medium">Secure Payment</p>
                <p className="text-xs text-muted-foreground">M-Pesa & Card</p>
              </div>
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
                  <RotateCcw className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-medium">Easy Returns</p>
                <p className="text-xs text-muted-foreground">14-day policy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Synopsis, Details, Reviews */}
        <div className="mt-12">
          <Tabs defaultValue="synopsis">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-8">
              <TabsTrigger 
                value="synopsis" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-3"
              >
                Synopsis
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
                Reviews ({book.reviewCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="synopsis" className="pt-6">
              <p className="text-muted-foreground leading-relaxed max-w-3xl">
                {book.synopsis}
              </p>
            </TabsContent>

            <TabsContent value="details" className="pt-6">
              <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Publisher</span>
                  <span className="font-medium">{book.publisher}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Pages</span>
                  <span className="font-medium">{book.pages || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-medium">{book.language || 'English'}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{book.category}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="pt-6">
              <p className="text-muted-foreground">
                Reviews will be available soon. Sign in to be the first to leave a review!
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BookDetail;
