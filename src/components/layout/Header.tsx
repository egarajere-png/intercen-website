import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/books', label: 'Books' },
  { href: '/categories', label: 'Categories' },
  { href: '/about', label: 'About Us' },
];

export const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between md:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-gold transition-transform group-hover:scale-105">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight md:text-2xl">
            Book<span className="text-primary">Haven</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.href
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Cart */}
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-secondary-foreground"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User Account */}
          <Link to="/auth">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <User className="h-5 w-5" />
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-lg font-medium py-2 transition-colors hover:text-primary ${
                      location.pathname === link.href
                        ? 'text-primary'
                        : 'text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-border my-4" />
                <Link
                  to="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-lg font-medium py-2 hover:text-primary"
                >
                  <User className="h-5 w-5" />
                  Sign In
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-lg font-medium py-2 hover:text-primary"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({itemCount})
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search Bar - Expandable */}
      {isSearchOpen && (
        <div className="border-t border-border/50 bg-muted/30 py-4 animate-fade-in">
          <div className="container">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search books, authors, or ISBN..."
                className="pl-12 h-12 text-base bg-background"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setIsSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
