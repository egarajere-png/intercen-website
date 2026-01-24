import React, { useState, useRef, useEffect } from 'react';
// Simple dropdown for user menu
import { supabase } from '@/lib/SupabaseClient';
function UserDropdown({ loggedIn, setLoggedIn, isMobile, onNavigate }: { loggedIn: boolean, setLoggedIn: (v: boolean) => void, isMobile?: boolean, onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  // Close dropdown on click outside
  React.useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);
  const menuClass = `absolute ${isMobile ? 'left-0' : 'right-0'} mt-2 w-44 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50`;
  return (
    <div className={`relative ${isMobile ? 'w-full' : ''}`} ref={btnRef}>
      <Button variant="ghost" size="icon" className={isMobile ? 'w-full flex justify-start' : ''} title={loggedIn ? 'Account' : 'Sign In'} onClick={() => setOpen(v => !v)}>
        <User className="h-5 w-5" />
      </Button>
      {open && (
        <div className={menuClass}>
          {loggedIn ? (
            <>
              <a href="/profile" className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => { setOpen(false); onNavigate && onNavigate(); }}>Profile</a>
              <a href="/upload" className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => { setOpen(false); onNavigate && onNavigate(); }}>Upload</a>
              <button className="block w-full text-left px-4 py-2 text-sm hover:bg-muted" onClick={async () => { await supabase.auth.signOut(); setLoggedIn(false); setOpen(false); window.location.reload(); }}>Logout</button>
            </>
          ) : (
            <a href="/auth" className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => { setOpen(false); onNavigate && onNavigate(); }}>Sign In</a>
          )}
        </div>
      )}
    </div>
  );
}
// Remove isAuthenticated import
import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import intercenLogo from '@/assets/intercen-books-logo.png';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/books', label: 'Books & Categories' },
  { href: '/publish', label: 'Publish With Us' },
  { href: '/services', label: 'Products & Services' },
  { href: '/about', label: 'About Us' },
];

export const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const [loggedIn, setLoggedIn] = useState(false);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between md:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img 
            src={intercenLogo} 
            alt="InterCEN Books" 
            className="h-10 md:h-12 w-auto transition-transform group-hover:scale-105"
          />
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
          {!loggedIn && (
            <Link to="/auth" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/auth' ? 'text-primary' : 'text-muted-foreground'}`}>Sign In</Link>
          )}
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
          {/* User Account Dropdown (Desktop) */}
          <span className="hidden md:flex">
            <UserDropdown loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
          </span>

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
                {/* User Account Dropdown (Mobile) */}
                <UserDropdown loggedIn={loggedIn} setLoggedIn={setLoggedIn} isMobile onNavigate={() => setIsMobileMenuOpen(false)} />
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
