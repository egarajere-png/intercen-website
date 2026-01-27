import React, { createContext, useContext, useState, useCallback } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { Book, CartItem } from '@/types/book';
import { toast } from 'sonner';

interface CartContextType {
  items: CartItem[];
  addToCart: (book: Book, quantity?: number) => void;
  removeFromCart: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback(async (book: Book, quantity = 1) => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to add items to your cart.');
      return;
    }
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.book.id === book.id);
      if (existingItem) {
        toast.success(`Updated "${book.title}" quantity in cart`);
        return prevItems.map(item =>
          item.book.id === book.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      toast.success(`Added "${book.title}" to cart`);
      return [...prevItems, { book, quantity }];
    });
  }, []);

  const removeFromCart = useCallback(async (bookId: string) => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to remove items from your cart.');
      return;
    }
    setItems(prevItems => {
      const item = prevItems.find(i => i.book.id === bookId);
      if (item) {
        toast.info(`Removed "${item.book.title}" from cart`);
      }
      return prevItems.filter(item => item.book.id !== bookId);
    });
  }, []);

  const updateQuantity = useCallback(async (bookId: string, quantity: number) => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to update your cart.');
      return;
    }
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.book.id === bookId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(async () => {
    if (!(await isAuthenticated())) {
      toast.error('You must be logged in to clear your cart.');
      return;
    }
    setItems([]);
    toast.info('Cart cleared');
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => total + item.book.price * item.quantity, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
    }}>
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
