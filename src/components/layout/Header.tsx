import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, Shield, BookOpen, Upload, Settings, LogOut, FileText, LayoutDashboard, ChevronDown, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/lib/SupabaseClient';
import intercenLogo from '@/assets/intercen-books-logo.png';

const navLinks = [
  { href: '/',         label: 'Home'              },
  { href: '/books',    label: 'Books & Categories' },
  { href: '/publish',  label: 'Publish With Us'    },
  { href: '/services', label: 'Products & Services'},
  { href: '/about',    label: 'About Us'           },
];

// ── Role-specific menu items shown in the user dropdown ──────────────────────
function getRoleMenuItems(role: string | null) {
  const base = [
    { href: '/profile', label: 'My Profile',   icon: User },
    { href: '/cart',    label: 'My Cart',       icon: ShoppingCart },
  ];

  if (role === 'admin') {
    return [
      { href: '/profile',            label: 'Admin Dashboard',    icon: LayoutDashboard },
      { href: '/upload',             label: 'Upload Content',      icon: Upload          },
      { href: '/content-management', label: 'Manage Content',      icon: Settings        },
      { href: '/admin/publications', label: 'Publication Requests',icon: FileText        },
      { href: '/cart',               label: 'My Cart',             icon: ShoppingCart    },
    ];
  }

  if (role === 'author' || role === 'publisher') {
    return [
      { href: '/profile',           label: 'Author Dashboard',  icon: LayoutDashboard },
      { href: '/publish/submit',    label: 'Submit Manuscript',  icon: FileText        },
      { href: '/author/submissions',label: 'My Submissions',     icon: BookOpen        },
      { href: '/cart',              label: 'My Cart',            icon: ShoppingCart    },
    ];
  }

  return base;
}

// ── Notification bell ─────────────────────────────────────────────────────────
function NotificationBell({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);
  const [open,  setOpen]  = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnread();
    // realtime
    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
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
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('user_id', userId).eq('read', false);
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
            <span className="font-forum text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {notifs.map(n => (
                <div key={n.id} className={`px-4 py-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className={!n.read ? '' : 'pl-4'}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
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

// ── User account dropdown ─────────────────────────────────────────────────────
function UserDropdown({ isMobile, onNavigate }: { isMobile?: boolean; onNavigate?: () => void }) {
  const { role, userId, loading } = useRole();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    onNavigate?.();
    navigate('/auth');
  };

  // Not logged in
  if (!loading && !userId) {
    if (isMobile) {
      return (
        <Link to="/auth" onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-accent hover:text-primary transition-all">
          <User className="h-5 w-5" /> Sign In
        </Link>
      );
    }
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/auth"><User className="h-4 w-4" /> Sign In</Link>
      </Button>
    );
  }

  if (loading) {
    return <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />;
  }

  const menuItems = getRoleMenuItems(role);
  const roleBadgeColor =
    role === 'admin'                            ? 'bg-red-100 text-red-700 border-red-200' :
    role === 'author' || role === 'publisher'   ? 'bg-blue-100 text-blue-700 border-blue-200' :
    'bg-muted text-muted-foreground border-border';

  // ── Mobile layout ──
  if (isMobile) {
    return (
      <div className="space-y-1">
        {menuItems.map(item => (
          <Link key={item.href} to={item.href}
            onClick={() => { setOpen(false); onNavigate?.(); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-accent hover:text-primary ${
              location.pathname === item.href ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-foreground'
            }`}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <button onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-destructive hover:bg-destructive/10 transition-all w-full text-left">
          <LogOut className="h-5 w-5" /> Sign Out
        </button>
      </div>
    );
  }

  // ── Desktop dropdown ──
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors group"
      >
        {/* Avatar / initials */}
        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-forum text-sm font-semibold">
          {role === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium hidden xl:block ${roleBadgeColor}`}>
          {role || 'user'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-background shadow-elevated z-50 overflow-hidden">
          {/* Role header */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border inline-block mt-0.5 ${roleBadgeColor}`}>
              {role || 'reader'}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {menuItems.map(item => (
              <Link key={item.href} to={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t py-1">
            <button onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left">
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
  const [isSearchOpen,    setIsSearchOpen]    = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const location  = useLocation();
  const navigate  = useNavigate();
  const { getItemCount, cart } = useCart();
  const { userId, role } = useRole();
  const itemCount = React.useMemo(() => getItemCount(), [cart]);

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
          <img src={intercenLogo} alt="InterCEN Books"
            className="h-10 md:h-12 w-auto transition-transform group-hover:scale-105" />
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map(link => (
            <Link key={link.href} to={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              }`}>
              {link.label}
            </Link>
          ))}
          {/* Admin-only quick link */}
          {role === 'admin' && (
            <Link to="/upload"
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                location.pathname === '/upload' ? 'text-primary' : 'text-muted-foreground'
              }`}>
              <Upload className="h-3.5 w-3.5" /> Upload
            </Link>
          )}
        </nav>

        {/* ── Desktop Actions ── */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Search */}
          <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setIsSearchOpen(!isSearchOpen)}>
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications — only when logged in */}
          {userId && (
            <div className="hidden lg:flex">
              <NotificationBell userId={userId} />
            </div>
          )}

          {/* Cart */}
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-secondary-foreground">
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User dropdown — desktop */}
          <div className="hidden lg:flex">
            <UserDropdown />
          </div>

          {/* Mobile menu toggle */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[380px] p-0">
              <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                <img src={intercenLogo} alt="InterCEN Books" className="h-10 w-auto" />
                {userId && role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    role === 'admin' ? 'bg-red-100 text-red-700 border-red-200' :
                    role === 'author' || role === 'publisher' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>{role}</span>
                )}
              </div>

              <div className="flex flex-col p-6 gap-6 overflow-y-auto max-h-[calc(100vh-88px)]">
                {/* Nav links */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Navigation</p>
                  <div className="space-y-1">
                    {navLinks.map(link => (
                      <Link key={link.href} to={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-accent hover:text-primary ${
                          location.pathname === link.href ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-foreground'
                        }`}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Search</p>
                  <form onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) { navigate(`/content-search?q=${encodeURIComponent(searchQuery.trim())}`); setIsMobileMenuOpen(false); setSearchQuery(''); } }}
                    className="px-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search books…" className="pl-9" />
                    </div>
                  </form>
                </div>

                {/* Cart */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cart</p>
                  <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-accent hover:text-primary transition-all">
                    <ShoppingCart className="h-5 w-5" />
                    My Cart
                    {itemCount > 0 && (
                      <Badge className="ml-auto bg-secondary text-secondary-foreground">{itemCount}</Badge>
                    )}
                  </Link>
                </div>

                {/* Account — role-aware */}
                <div>
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</p>
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
              <Button variant="ghost" size="icon" type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};