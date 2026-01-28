/**
 * Cart Context
 * Manages shopping cart state using Supabase edge functions
 * Replaces local state management with database-backed cart
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  cart_id: string;
  content_id: string;
  quantity: number;
  price: number;
  added_at: string;
  content: {
    id: string;
    title: string;
    subtitle: string | null;
    author: string | null;
    cover_image_url: string | null;
    price: number;
    stock_quantity: number;
  };
  item_subtotal: number;
}

interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
  subtotal: number;
  total_items: number;
}

interface Book {
  id: string;
  title: string;
  author?: string;
  price: number;
  [key: string]: any;
}

interface CartContextType {
  items: CartItem[];
  cart: Cart | null;
  loading: boolean;
  addToCart: (book: Book, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
  getItemCount: () => number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  };

  const refreshCart = useCallback(async () => {
    try {
      if (!(await isAuthenticated())) {
        setCart(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('cart-get');

      if (error) {
        console.error('Error fetching cart:', error);
        setCart(null);
        return;
      }

      setCart(data);
    } catch (error) {
      console.error('Error refreshing cart:', error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch cart on mount
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Listen for cart updates from other components
  useEffect(() => {
    const handleCartUpdate = () => {
      refreshCart();
    };

    window.addEventListener('cart-updated', handleCartUpdate);

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [refreshCart]);

  const addToCart = useCallback(async (book: Book, quantity = 1) => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to add items to your cart.');
      return;
    }

    // Optimistically update cart for instant UI feedback
    setCart(prevCart => {
      if (!prevCart) {
        // If no cart exists, create a new one
        return {
          id: 'optimistic',
          user_id: 'optimistic',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [
            {
              id: book.id,
              cart_id: 'optimistic',
              content_id: book.id,
              quantity: quantity,
              price: book.price,
              added_at: new Date().toISOString(),
              content: {
                id: book.id,
                title: book.title,
                subtitle: book.subtitle || null,
                author: book.author || null,
                cover_image_url: book.cover_image_url || null,
                price: book.price,
                stock_quantity: book.stock_quantity || 99,
              },
              item_subtotal: book.price * quantity,
            },
          ],
          subtotal: book.price * quantity,
          total_items: quantity,
        };
      }
      // If cart exists, update items
      const existing = prevCart.items.find(i => i.content_id === book.id);
      let newItems;
      if (existing) {
        newItems = prevCart.items.map(i =>
          i.content_id === book.id
            ? { ...i, quantity: i.quantity + quantity, item_subtotal: (i.quantity + quantity) * i.price }
            : i
        );
      } else {
        newItems = [
          ...prevCart.items,
          {
            id: book.id,
            cart_id: prevCart.id,
            content_id: book.id,
            quantity: quantity,
            price: book.price,
            added_at: new Date().toISOString(),
            content: {
              id: book.id,
              title: book.title,
              subtitle: book.subtitle || null,
              author: book.author || null,
              cover_image_url: book.cover_image_url || null,
              price: book.price,
              stock_quantity: book.stock_quantity || 99,
            },
            item_subtotal: book.price * quantity,
          },
        ];
      }
      const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
      const subtotal = newItems.reduce((sum, i) => sum + i.item_subtotal, 0);
      return {
        ...prevCart,
        items: newItems,
        total_items: totalItems,
        subtotal,
        updated_at: new Date().toISOString(),
      };
    });

    try {
      const { data, error } = await supabase.functions.invoke('cart-add-item', {
        body: { content_id: book.id, quantity },
      });

      if (error) throw error;

      // Always refresh from server after add
      await refreshCart();
      toast.success(`Added "${book.title}" to cart`);
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      if (error.message?.includes('stock')) {
        toast.error(error.message || 'Insufficient stock');
      } else if (error.message?.includes('not available')) {
        toast.error('This item is not currently available');
      } else {
        toast.error(error.message || 'Failed to add item to cart');
      }
    }
  }, []);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to remove items from your cart.');
      return;
    }

    try {
      const item = cart?.items.find(i => i.id === cartItemId);
      const { data, error } = await supabase.functions.invoke('cart-remove-item', {
        body: { cart_item_id: cartItemId },
      });
      if (error) throw error;
      // Always refresh from server after remove
      await refreshCart();
      if (item) {
        toast.info(`Removed "${item.content.title}" from cart`);
      }
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      toast.error(error.message || 'Failed to remove item from cart');
    }
  }, [cart]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to update your cart.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('cart-update-quantity', {
        body: { cart_item_id: cartItemId, quantity },
      });
      if (error) throw error;
      // Always refresh from server after update
      await refreshCart();
      if (quantity === 0) {
        const item = cart?.items.find(i => i.id === cartItemId);
        if (item) {
          toast.info(`Removed "${item.content.title}" from cart`);
        }
      }
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      if (error.message?.includes('stock')) {
        toast.error(error.message || 'Insufficient stock');
      } else {
        toast.error(error.message || 'Failed to update quantity');
      }
    }
  }, [cart]);

  const clearCart = useCallback(async () => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to clear your cart.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('cart-clear');
      if (error) throw error;
      // Always refresh from server after clear
      await refreshCart();
      toast.info('Cart cleared');
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast.error(error.message || 'Failed to clear cart');
    }
  }, []);

  const getTotal = useCallback(() => {
    return cart?.subtotal || 0;
  }, [cart]);

  const getItemCount = useCallback(() => {
    return cart?.total_items || 0;
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        items: cart?.items || [],
        cart,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};