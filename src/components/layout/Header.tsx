import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Menu, X, Upload,
  BookOpen, FileText, LayoutDashboard, Settings,
  LogOut, ChevronDown, Bell, UserCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/lib/SupabaseClient';
import intercenLogo from '@/assets/intercen-books-logo.png';

// ── Constants ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://nnljrawwhibazudjudht.supabase.co';

const navLinks = [
  { href: '/',         label: 'Home'               },
  { href: '/books',    label: 'Books & Categories'  },
  { href: '/publish',  label: 'Publish With Us'     },
  { href: '/services', label: 'Products & Services' },
  { href: '/about',    label: 'About Us'            },
];

// ── Role-specific dropdown menu items ─────────────────────────────────────────
function getRoleMenuItems(role: string | null) {
  if (role === 'admin') {
    return [
      { href: '/profile',            label: 'Admin Dashboard',     icon: LayoutDashboard },
      { href: '/upload',             label: 'Upload Content',       icon: Upload          },
      { href: '/content-management', label: 'Manage Content',       icon: Settings        },
      { href: '/admin/publications', label: 'Publication Requests', icon: FileText        },
      { href: '/cart',               label: 'My Cart',              icon: ShoppingCart    },
    ];
  }
  if (role === 'author' || role === 'publisher') {
    return [
      { href: '/profile',            label: 'Author Dashboard',    icon: LayoutDashboard },
      { href: '/publish/submit',     label: 'Submit Manuscript',   icon: FileText        },
      { href: '/author/submissions', label: 'My Submissions',      icon: BookOpen        },
      { href: '/cart',               label: 'My Cart',             icon: ShoppingCart    },
    ];
  }
  return [
    { href: '/profile', label: 'My Profile', icon: UserCircle2  },
    { href: '/cart',    label: 'My Cart',    icon: ShoppingCart },
  ];
}

// ── Hook: live cart count fetched from DB ─────────────────────────────────────
function useCartCount(userId: string | null) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!userId) { setCount(0); return; }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCount(0); return; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/cart-get`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) { setCount(0); return; }

      const data = await res.json();
      // summary.item_count is the number of distinct line items;
      // sum quantities for the actual total item count shown on badge
      const total = (data.items ?? []).reduce(
        (sum: number, item: any) => sum + (item.quantity ?? 1), 0
      );
      setCount(total);
    } catch {
      setCount(0);
    }
  }, [userId]);

  // Fetch on mount and whenever userId changes (login / logout / refresh)
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Realtime: re-fetch when cart_items table changes for this user's cart
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`cart-count-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items' },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchCount]);

  // Re-fetch when tab regains focus (user may have added items in another tab)
  useEffect(() => {
    const onFocus = () => fetchCount();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCount]);

  return { count, refresh: fetchCount };
}

// ── Notification Bell ─────────────────────────────────────────────────────────
function NotificationBell({ userId }: { userId: string }) {
  const [count,  setCount]  = useState(0);
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnread();
    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchUnread()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const fetchUnread = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8);
    setNotifs(data || []);
    setCount((data || []).filter((n: any) => !n.read).length);
  };

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-background shadow-elevated z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            {count > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {notifs.map(n => (
                <div key={n.id} className={`px-4 py-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                    <div className={!n.read ? '' : 'pl-4'}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── User Dropdown ─────────────────────────────────────────────────────────────
// Uses a single UserCircle2 icon (person) for all roles — no role-specific icons
// on the trigger button itself.
function UserDropdown({
  isMobile,
  onNavigate,
}: {
  isMobile?: boolean;
  onNavigate?: () => void;
}) {
  const { role, userId, loading } = useRole();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    onNavigate?.();
    navigate('/auth');
  };

  // ── Not logged in ──
  if (!loading && !userId) {
    if (isMobile) {
      return (
        <Link
          to="/auth"
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-accent hover:text-primary transition-all"
        >
          <UserCircle2 className="h-5 w-5" /> Sign In
        </Link>
      );
    }
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/auth">
          <UserCircle2 className="h-4 w-4" /> Sign In
        </Link>
      </Button>
    );
  }

  if (loading) {
    return <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />;
  }

  const menuItems = getRoleMenuItems(role);

  // ── Mobile layout ──
  if (isMobile) {
    return (
      <div className="space-y-1">
        {menuItems.map(item => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => { setOpen(false); onNavigate?.(); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-accent hover:text-primary ${
              location.pathname === item.href
                ? 'bg-primary/10 text-primary border-l-4 border-primary'
                : 'text-foreground'
            }`}
          >
            {/* No icon rendered — label only for clean mobile list */}
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-destructive hover:bg-destructive/10 transition-all w-full text-left"
        >
          <LogOut className="h-5 w-5" /> Sign Out
        </button>
      </div>
    );
  }

  // ── Desktop dropdown ──
  // Trigger: single person icon (UserCircle2) + chevron — no role-specific icons
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors group"
        aria-label="Account menu"
      >
        <UserCircle2 className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-background shadow-elevated z-50 overflow-hidden">
          {/* Role header */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-xs font-semibold capitalize mt-0.5 text-foreground">
              {role || 'reader'}
            </p>
          </div>

          {/* Menu items — no icons, clean text list */}
          <div className="py-1">
            {menuItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                  location.pathname === item.href
                    ? 'text-primary font-medium'
                    : 'text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Header ───────────────────────────────────────────────────────────────
export const Header = () => {
  const [isSearchOpen,     setIsSearchOpen]     = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, role } = useRole();

  // ── DB-backed cart count — persists across refreshes ──
  const { count: itemCount } = useCartCount(userId);

  // Re-fetch cart on auth state change (login / token refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // useCartCount's own useEffect handles this via userId dep,
      // but an explicit focus-refresh is also wired inside the hook.
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/content-search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between md:h-20">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src={intercenLogo}
            alt="InterCEN Books"
            className="h-10 md:h-12 w-auto transition-transform group-hover:scale-105"
          />
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link
              to="/upload"
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                location.pathname === '/upload' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </Link>
          )}
        </nav>

        {/* ── Desktop Actions ── */}
        <div className="flex items-center gap-1 md:gap-2">

          {/* Search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications — logged in only */}
          {userId && (
            <div className="hidden lg:flex">
              <NotificationBell userId={userId} />
            </div>
          )}

          {/* Cart icon with live badge ── always shows DB count */}
          <Link to="/cart" aria-label={`Shopping cart, ${itemCount} items`}>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-secondary-foreground">
                  {itemCount > 99 ? '99+' : itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User dropdown — desktop — single person icon trigger */}
          <div className="hidden lg:flex">
            <UserDropdown />
          </div>

          {/* Mobile menu toggle */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[300px] sm:w-[380px] p-0">
              <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                <img src={intercenLogo} alt="InterCEN Books" className="h-10 w-auto" />
                {userId && role && (
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-muted text-muted-foreground border-border capitalize">
                    {role}
                  </span>
                )}
              </div>

              <div className="flex flex-col p-6 gap-6 overflow-y-auto max-h-[calc(100vh-88px)]">
                {/* Nav links */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Navigation
                  </p>
                  <div className="space-y-1">
                    {navLinks.map(link => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-accent hover:text-primary ${
                          location.pathname === link.href
                            ? 'bg-primary/10 text-primary border-l-4 border-primary'
                            : 'text-foreground'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Search
                  </p>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        navigate(`/content-search?q=${encodeURIComponent(searchQuery.trim())}`);
                        setIsMobileMenuOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    className="px-4"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search books…"
                        className="pl-9"
                      />
                    </div>
                  </form>
                </div>

                {/* Cart */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Cart
                  </p>
                  <Link
                    to="/cart"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-accent hover:text-primary transition-all"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    My Cart
                    {itemCount > 0 && (
                      <Badge className="ml-auto bg-secondary text-secondary-foreground">
                        {itemCount > 99 ? '99+' : itemCount}
                      </Badge>
                    )}
                  </Link>
                </div>

                {/* Account */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Account
                  </p>
                  <UserDropdown isMobile onNavigate={() => setIsMobileMenuOpen(false)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Expandable Search Bar ── */}
      {isSearchOpen && (
        <div className="border-t border-border/50 bg-muted/30 py-4 animate-fade-in">
          <div className="container">
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search books, authors, or ISBN…"
                className="pl-12 h-12 text-base bg-background"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};