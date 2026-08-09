import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Lab-booking cart: holds selected diagnostic tests / health packages
 * until checkout. Persisted to localStorage so the cart survives reloads.
 * Item shape: { id, name, price, mrp, type: 'test' | 'package' }
 */
const CART_STORAGE_KEY = 'medis_cart';

/** Read the persisted cart, falling back to an empty cart on any error. */
const readStoredCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable (private mode / quota) — cart still works in memory
    }
  }, [items]);

  const addItem = useCallback((item, type) => {
    setItems((prev) => {
      const key = `${type}-${item.id}`;
      if (prev.some((i) => `${i.type}-${i.id}` === key)) return prev;
      return [...prev, { id: item.id, name: item.name, price: item.price, mrp: item.mrp, type }];
    });
  }, []);

  const removeItem = useCallback((id, type) => {
    setItems((prev) => prev.filter((i) => !(String(i.id) === String(id) && i.type === type)));
  }, []);

  const toggleItem = useCallback((item, type) => {
    setItems((prev) => {
      const key = `${type}-${item.id}`;
      const exists = prev.some((i) => `${i.type}-${i.id}` === key);
      if (exists) return prev.filter((i) => `${i.type}-${i.id}` !== key);
      return [...prev, { id: item.id, name: item.name, price: item.price, mrp: item.mrp, type }];
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const inCart = useCallback(
    (id, type) => items.some((i) => String(i.id) === String(id) && i.type === type),
    [items]
  );

  const total = items.reduce((sum, i) => sum + i.price, 0);
  const mrpTotal = items.reduce((sum, i) => sum + (i.mrp || i.price), 0);

  const value = { items, addItem, removeItem, toggleItem, clearCart, inCart, total, mrpTotal, count: items.length };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
