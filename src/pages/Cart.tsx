import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

const Cart = () => {
  const { items, updateQuantity, removeFromCart, getTotal, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 md:py-24 text-center">
          <div className="max-w-md mx-auto">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="headline-2 mb-4">Your Cart is Empty</h1>
            <p className="body-2 text-muted-foreground mb-8">
              Looks like you haven't added any books yet. Start exploring our collection!
            </p>
            <Link to="/books">
              <Button variant="hero" size="lg" className="gap-2">
                Browse Books
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="headline-2 mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div
                key={item.book.id}
                className="flex gap-4 p-4 bg-card rounded-xl shadow-soft"
              >
                {/* Book Image */}
                <Link to={`/books/${item.book.id}`} className="shrink-0">
                  <div className="w-20 h-28 md:w-24 md:h-36 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link to={`/books/${item.book.id}`}>
                    <h3 className="font-serif font-semibold text-lg truncate hover:text-primary">
                      {item.book.title}
                    </h3>
                  </Link>
                  <p className="text-muted-foreground text-sm mb-2">
                    by {item.book.author}
                  </p>
                  <p className="text-lg font-bold text-primary">
                    ${item.book.price.toFixed(2)}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center border rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.book.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.book.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-bold">
                    ${(item.book.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}

            {/* Clear Cart */}
            <Button variant="outline" className="w-full" onClick={clearCart}>
              Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl shadow-card p-6 sticky top-24">
              <h2 className="font-serif text-xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      ${getTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Link to="/checkout">
                <Button variant="hero" size="lg" className="w-full gap-2">
                  Proceed to Checkout
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Secure checkout with M-Pesa or Card
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
