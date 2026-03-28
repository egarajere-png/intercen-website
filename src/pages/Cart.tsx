import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, Plus, Minus, Trash2,
  User, MapPin, Truck, Package, CheckCircle,
  Search, ChevronDown, ChevronUp, AlertCircle, Store
} from "lucide-react";
import { supabase } from '../lib/SupabaseClient';
import { Layout } from '@/components/layout/Layout';

const SUPABASE_URL = 'https://nnljrawwhibazudjudht.supabase.co';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  content_id: string;
  quantity: number;
  price: number;
  content: {
    id: string;
    title: string;
    author: string;
    cover_image_url: string;
    stock_quantity: number;
    is_for_sale: boolean;
    status: string;
  };
}

interface DeliveryRegion {
  id: string;
  name: string;
  description: string;
  base_cost: number;
  min_cost: number;
  max_cost: number;
  est_days: string;
  sort_order: number;
}

interface DeliveryZone {
  id: string;
  region_id: string;
  name: string;
  cost: number;
  est_days: string | null;
  keywords: string[];
  sort_order: number;
  region: DeliveryRegion;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CACHE  (survives unmount/remount — no loading flash on back-nav)
// ─────────────────────────────────────────────────────────────────────────────
interface CartCache {
  items: CartItem[];
  cartId: string | null;
  userId: string | null;
  initialised: boolean;
}
const cartCache: CartCache = {
  items: [], cartId: null, userId: null, initialised: false,
};

// Zones are even more stable — cache them process-wide
let zonesCache: DeliveryZone[]  = [];
let regionsCache: DeliveryRegion[] = [];
let zonesFetched = false;

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY ZONE SELECTOR  (self-contained sub-component)
// ─────────────────────────────────────────────────────────────────────────────
interface ZoneSelectorProps {
  zones: DeliveryZone[];
  regions: DeliveryRegion[];
  selectedZone: DeliveryZone | null;
  onSelect: (zone: DeliveryZone) => void;
  cityHint: string; // pre-populated from shippingAddress.city
}

const DeliveryZoneSelector: React.FC<ZoneSelectorProps> = ({
  zones, regions, selectedZone, onSelect, cityHint
}) => {
  const [query, setQuery]               = useState('');
  const [openRegion, setOpenRegion]     = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // When the parent city changes and there's no zone selected yet,
  // auto-populate the search box
  useEffect(() => {
    if (!selectedZone && cityHint) {
      setQuery(cityHint);
    }
  }, [cityHint, selectedZone]);

  // Live search: match against name and keywords (case-insensitive)
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return zones.filter(z =>
      z.name.toLowerCase().includes(q) ||
      z.keywords.some(k => k.includes(q))
    );
  }, [query, zones]);

  const hasResults    = searchResults.length > 0;
  const isSearching   = query.trim().length > 0;

  // Group all zones by region (for the fallback accordion)
  const grouped = useMemo(() => {
    return regions
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(region => ({
        region,
        zones: zones
          .filter(z => z.region_id === region.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }))
      .filter(g => g.zones.length > 0);
  }, [regions, zones]);

  const handleSelect = (zone: DeliveryZone) => {
    onSelect(zone);
    setQuery(zone.name);
    setShowFallback(false);
  };

  const regionIcon = (name: string) => {
    switch (name) {
      case 'CBD':       return '';
      case 'Nairobi':   return '';
      case 'Upcountry': return '';
      case 'Pickup':    return '';
      default:          return '';
    }
  };

  const costLabel = (zone: DeliveryZone) =>
    zone.cost === 0 ? 'Free' : `KSh ${zone.cost.toLocaleString()}`;

  return (
    <div className="space-y-4">

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowFallback(false); }}
          placeholder="Type your location (e.g. Karen, Mombasa, Thika…)"
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); onSelect(null as any); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {isSearching && (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          {hasResults ? (
            <ul>
              {searchResults.map((zone) => (
                <li key={zone.id}>
                  <button
                    onClick={() => handleSelect(zone)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary/5 transition text-sm
                      ${selectedZone?.id === zone.id ? 'bg-primary/10 font-semibold' : ''}`}
                  >
                    <div>
                      <span className="font-medium">{zone.name}</span>
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {zone.region.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold text-primary">{costLabel(zone)}</p>
                      <p className="text-xs text-gray-500">{zone.est_days ?? zone.region.est_days}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            /* No match — offer the fallback picker */
            <div className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-2 text-amber-700 mb-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  We don't have <strong>"{query}"</strong> listed yet.
                  Please choose the nearest location below — we'll deliver to you from there.
                </p>
              </div>
              <button
                onClick={() => setShowFallback(true)}
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                Browse all delivery areas →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fallback: accordion of all zones grouped by region */}
      {(showFallback || (!isSearching && !selectedZone)) && (
        <div className="border rounded-lg overflow-hidden divide-y">
          {grouped.map(({ region, zones: rZones }) => {
            const isOpen = openRegion === region.id;
            return (
              <div key={region.id}>
                {/* Region header */}
                <button
                  onClick={() => setOpenRegion(isOpen ? null : region.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <span>{regionIcon(region.name)}</span>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{region.name}</p>
                      <p className="text-xs text-gray-500">{region.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs font-medium text-primary">
                      {region.min_cost === 0 && region.max_cost === 0
                        ? 'Free'
                        : `KSh ${region.min_cost}–${region.max_cost}`}
                    </span>
                    {isOpen
                      ? <ChevronUp  className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {/* Zone list */}
                {isOpen && (
                  <ul className="divide-y bg-white">
                    {rZones.map(zone => (
                      <li key={zone.id}>
                        <button
                          onClick={() => handleSelect(zone)}
                          className={`w-full flex items-center justify-between px-6 py-2.5 text-left hover:bg-primary/5 transition text-sm
                            ${selectedZone?.id === zone.id ? 'bg-primary/10' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            {selectedZone?.id === zone.id && (
                              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            )}
                            <span className={selectedZone?.id === zone.id ? 'font-semibold' : ''}>
                              {zone.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="font-semibold text-primary">{costLabel(zone)}</p>
                            <p className="text-xs text-gray-500">{zone.est_days ?? region.est_days}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected zone summary */}
      {selectedZone && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>
              Delivering to <strong>{selectedZone.name}</strong>
              {' '}· {selectedZone.est_days ?? selectedZone.region.est_days}
            </span>
          </div>
          <span className="font-bold text-green-700 shrink-0 ml-4">
            {selectedZone.cost === 0 ? 'Free' : `KSh ${selectedZone.cost.toLocaleString()}`}
          </span>
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// MAIN CART COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Cart = () => {
  const navigate = useNavigate();

  // ── State seeded from cache ───────────────────────────────────────────
  const [cartItems, setCartItems]           = useState<CartItem[]>(cartCache.items);
  const [cartId, setCartId]                 = useState<string | null>(cartCache.cartId);
  const [user, setUser]                     = useState<any>(null);
  const [loading, setLoading]               = useState(!cartCache.initialised);
  const [refreshing, setRefreshing]         = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing]     = useState(false);
  const fetchAbortRef                       = useRef<number>(0);

  // ── Delivery zones ────────────────────────────────────────────────────
  const [zones, setZones]             = useState<DeliveryZone[]>(zonesCache);
  const [regions, setRegions]         = useState<DeliveryRegion[]>(regionsCache);
  const [zonesLoading, setZonesLoading] = useState(!zonesFetched);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [deliveryReviewed, setDeliveryReviewed] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────
  const [customerInfo, setCustomerInfo] = useState({ fullName: '', email: '', phone: '' });
  const [shippingAddress, setShippingAddress] = useState({ address: '', city: '', postalCode: '' });
  const [discountCode, setDiscountCode]           = useState('');
  const [appliedDiscount, setAppliedDiscount]     = useState<{
    code: string; amount: number; type: 'percentage' | 'fixed';
  } | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<{
    open: boolean; orderNumber?: string; orderId?: string;
  }>({ open: false });

  // ── Helpers ───────────────────────────────────────────────────────────
  const applyCartData = useCallback((items: CartItem[], id: string | null, currentUser: any) => {
    cartCache.items       = items;
    cartCache.cartId      = id;
    cartCache.userId      = currentUser?.id ?? null;
    cartCache.initialised = true;
    setCartItems(items);
    setCartId(id);
    setUser(currentUser);
  }, []);

  // ── Fetch delivery zones from Supabase ────────────────────────────────
  const fetchZones = useCallback(async () => {
    if (zonesFetched) return; // already loaded process-wide
    setZonesLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select(`
          id, region_id, name, cost, est_days, keywords, sort_order,
          delivery_regions (
            id, name, description, base_cost, min_cost, max_cost, est_days, sort_order
          )
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const mapped: DeliveryZone[] = (data ?? []).map((row: any) => ({
        ...row,
        region: row.delivery_regions,
      }));

      const uniqueRegions: DeliveryRegion[] = Object.values(
        mapped.reduce((acc: any, z) => {
          acc[z.region.id] = z.region;
          return acc;
        }, {})
      );

      zonesCache   = mapped;
      regionsCache = uniqueRegions;
      zonesFetched = true;

      setZones(mapped);
      setRegions(uniqueRegions);
    } catch (err) {
      console.error('Failed to fetch delivery zones:', err);
    } finally {
      setZonesLoading(false);
    }
  }, []);

  // ── Fetch cart ────────────────────────────────────────────────────────
  const fetchCart = useCallback(async (silent = false) => {
    const fetchToken = ++fetchAbortRef.current;
    if (silent) setRefreshing(true);
    else        setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (fetchToken !== fetchAbortRef.current) return;

      if (!session) { applyCartData([], null, null); return; }

      setCustomerInfo(prev => ({ ...prev, email: prev.email || session.user.email || '' }));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/cart-get`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (fetchToken !== fetchAbortRef.current) return;

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Cart fetch failed:', err);
        if (!silent) applyCartData([], null, session.user);
        return;
      }

      const data = await response.json();
      applyCartData(data.items ?? [], data.cart?.id ?? null, session.user);

    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      if (fetchToken === fetchAbortRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyCartData]);

  // ── On mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchZones();

    if (cartCache.initialised) {
      setLoading(false);
      fetchCart(true);
    } else {
      fetchCart(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setCustomerInfo(prev => ({ ...prev, email: prev.email || session.user.email || '' }));
        fetchCart(!cartCache.initialised ? false : true);
      } else if (event === 'SIGNED_OUT') {
        applyCartData([], null, null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user);
        if (!cartCache.initialised) fetchCart(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Remove item ───────────────────────────────────────────────────────
  const removeItem = async (itemId: string, contentId: string) => {
    if (removingItemId) return;
    setRemovingItemId(itemId);
    const updated = cartCache.items.filter(i => i.id !== itemId);
    cartCache.items = updated;
    setCartItems(updated);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/cart-remove-item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart_item_id: itemId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to remove item');
      }
    } catch (error: any) {
      console.error('Error removing item:', error);
      alert(error.message || 'Failed to remove item. Please try again.');
      fetchCart(true);
    } finally {
      setRemovingItemId(null);
    }
  };

  // ── Update quantity ───────────────────────────────────────────────────
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      const item = cartItems.find(i => i.id === itemId);
      if (item) removeItem(itemId, item.content_id);
      return;
    }
    const updated = cartCache.items.map(i =>
      i.id === itemId ? { ...i, quantity: newQuantity } : i
    );
    cartCache.items = updated;
    setCartItems(updated);

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating quantity:', err);
      fetchCart(true);
    }
  };

  // ── Discount ──────────────────────────────────────────────────────────
  const applyDiscount = () => {
    if (discountCode.toUpperCase() === 'SAVE10') {
      setAppliedDiscount({ code: 'SAVE10', amount: 10, type: 'percentage' });
    } else {
      alert('Invalid discount code');
    }
  };

  // ── Checkout ──────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!user)                  { alert('Please log in to checkout'); navigate('/auth'); return; }
    if (!customerInfo.fullName || !customerInfo.phone)
                                { alert('Please fill in all customer information'); return; }
    if (!shippingAddress.address || !shippingAddress.city)
                                { alert('Please provide a shipping address'); return; }
    if (!selectedZone)          { alert('Please select a delivery location'); return; }
    if (!deliveryReviewed)      { alert('Please review and confirm delivery details'); return; }

    try {
      setIsProcessing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Session expired. Please log in again.'); navigate('/auth'); return; }

      const checkoutData = {
        customer_info: {
          fullName: customerInfo.fullName,
          email:    customerInfo.email || session.user.email,
          phone:    customerInfo.phone,
        },
        shipping_address: {
          address:    shippingAddress.address,
          city:       shippingAddress.city,
          postalCode: shippingAddress.postalCode,
        },
        delivery_method: {
          id:           selectedZone.id,
          name:         selectedZone.name,
          cost:         selectedZone.cost,
          estimatedDays: selectedZone.est_days ?? selectedZone.region.est_days,
          region:       selectedZone.region.name,
        },
        discount_code: appliedDiscount?.code || undefined,
      };

      const { data, error } = await supabase.functions.invoke('checkout-initiate', {
        body: checkoutData,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.success) {
        alert(data?.error || error?.message || 'Checkout failed');
        return;
      }

      // Clear cache after successful order
      cartCache.items       = [];
      cartCache.cartId      = null;
      cartCache.initialised = false;

      setOrderConfirmation({ open: true, orderNumber: data.order_number, orderId: data.order_id });
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────
  const subtotal       = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percentage'
      ? (subtotal * appliedDiscount.amount) / 100
      : appliedDiscount.amount
    : 0;
  const deliveryCost = selectedZone?.cost ?? 0;
  const total        = subtotal - discountAmount + deliveryCost;

  // ── Modals ────────────────────────────────────────────────────────────
  const OrderConfirmationModal = () =>
    orderConfirmation.open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
          <p className="mb-4">Your order was created successfully.</p>
          <p className="mb-4 font-semibold">
            Order Number: <span className="text-primary">{orderConfirmation.orderNumber}</span>
          </p>
          <button
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 w-full"
            onClick={() => {
              setOrderConfirmation({ open: false });
              if (orderConfirmation.orderId) navigate(`/checkout/payment/${orderConfirmation.orderId}`);
            }}
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    ) : null;

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p>Loading your cart…</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <OrderConfirmationModal />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
            {refreshing && (
              <div
                className="ml-2 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"
                title="Syncing cart…"
              />
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some items to get started!</p>
              <Link
                to="/books"
                className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Browse Books
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">

              {/* ── Left column ─────────────────────────────────────── */}
              <div className="lg:col-span-2 space-y-6">

                {/* Cart items */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Cart Items ({cartItems.length})
                  </h2>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 border-b pb-4 last:border-b-0">
                        <img
                          src={item.content?.cover_image_url || '/placeholder-book.png'}
                          alt={item.content?.title || 'Book'}
                          className="w-20 h-28 object-cover rounded"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-book.png'; }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.content?.title}</h3>
                          <p className="text-sm text-gray-600">{item.content?.author}</p>
                          <p className="text-primary font-semibold mt-1">
                            KSh {item.price.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 rounded hover:bg-gray-100"
                              disabled={!!removingItemId}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-3 py-1 border rounded">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 rounded hover:bg-gray-100"
                              disabled={
                                !!removingItemId ||
                                (item.content?.stock_quantity != null &&
                                  item.quantity >= item.content.stock_quantity)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id, item.content_id)}
                              disabled={removingItemId === item.id}
                              className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                            >
                              {removingItemId === item.id
                                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                                : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer info */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Customer Information</h2>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Full Name *',     field: 'fullName', type: 'text',  placeholder: 'John Doe' },
                      { label: 'Email *',         field: 'email',    type: 'email', placeholder: 'john@example.com' },
                      { label: 'Phone Number *',  field: 'phone',    type: 'tel',   placeholder: '+254 700 000 000' },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field}>
                        <label className="block text-sm font-medium mb-1">{label}</label>
                        <input
                          type={type}
                          value={(customerInfo as any)[field]}
                          onChange={e => setCustomerInfo({ ...customerInfo, [field]: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping address */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Shipping Address</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Street Address *</label>
                      <input
                        type="text"
                        value={shippingAddress.address}
                        onChange={e => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City *</label>
                        <input
                          type="text"
                          value={shippingAddress.city}
                          onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Nairobi"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={shippingAddress.postalCode}
                          onChange={e => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="00100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Delivery zone selector ─────────────────────────── */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Delivery Location</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Search for your area. If it's not listed, pick the nearest location.
                  </p>

                  {zonesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Loading delivery areas…
                    </div>
                  ) : (
                    <DeliveryZoneSelector
                      zones={zones}
                      regions={regions}
                      selectedZone={selectedZone}
                      onSelect={setSelectedZone}
                      cityHint={shippingAddress.city}
                    />
                  )}

                  {/* Confirm checkbox */}
                  {selectedZone && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deliveryReviewed}
                          onChange={e => setDeliveryReviewed(e.target.checked)}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">
                          I have reviewed and confirmed the delivery details
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Discount */}
                {/* <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Discount Code</h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={e => setDiscountCode(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter discount code"
                    />
                    <button
                      onClick={applyDiscount}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedDiscount && (
                    <p className="text-green-600 text-sm mt-2">
                      ✓ Discount <strong>{appliedDiscount.code}</strong> applied — {appliedDiscount.amount}% off
                    </p>
                  )}
                </div> */}
              </div>

              {/* ── Right column — Order Summary ─────────────────────── */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                  <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold">KSh {subtotal.toLocaleString()}</span>
                    </div>
                    {appliedDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedDiscount.code})</span>
                        <span>-KSh {discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <div className="text-right">
                        {selectedZone ? (
                          <>
                            <span className="font-semibold">
                              {deliveryCost === 0 ? 'Free' : `KSh ${deliveryCost.toLocaleString()}`}
                            </span>
                            <p className="text-xs text-gray-500">{selectedZone.name}</p>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Select location</span>
                        )}
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">KSh {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing || !user || !deliveryReviewed || !selectedZone}
                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Package className="h-5 w-5" />
                        Place Order
                      </>
                    )}
                  </button>

                  {/* Helper messages */}
                  {!user && (
                    <p className="text-sm text-red-500 mt-2 text-center">Please log in to checkout</p>
                  )}
                  {user && !selectedZone && (
                    <p className="text-sm text-amber-600 mt-2 text-center">Select a delivery location</p>
                  )}
                  {user && selectedZone && !deliveryReviewed && (
                    <p className="text-sm text-amber-600 mt-2 text-center">Please confirm delivery details</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Cart;