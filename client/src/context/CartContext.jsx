import { createContext, useContext, useEffect, useState } from 'react';
import { getPriceIncludingTax } from '../utils/pricing';

const CartContext = createContext(null);
const getProductKey = (product) => {
  const value = product?._id ?? product?.id ?? product?.sku;
  return value === undefined || value === null || value === '' ? null : String(value);
};
const itemMatches = (item, id) => {
  const itemKey = getProductKey(item);
  const requestedKey = id === undefined || id === null || id === '' ? null : String(id);
  return itemKey !== null && requestedKey !== null && itemKey === requestedKey;
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('bijlicartCart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item) => getProductKey(item) && Number.isInteger(item.quantity) && item.quantity > 0)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('bijlicartCart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const syncCartFromAnotherTab = (event) => {
      if (event.key !== 'bijlicartCart') return;
      try {
        const parsed = event.newValue ? JSON.parse(event.newValue) : [];
        setCart(Array.isArray(parsed)
          ? parsed.filter((item) => getProductKey(item) && Number.isInteger(item.quantity) && item.quantity > 0)
          : []);
      } catch {
        setCart([]);
      }
    };
    window.addEventListener('storage', syncCartFromAnotherTab);
    return () => window.removeEventListener('storage', syncCartFromAnotherTab);
  }, []);

  function addToCart(product) {
    const cartProduct = product;
    const productKey = getProductKey(cartProduct);
    if (!productKey) return;
    setCart((prev) => {
      const exists = prev.find((i) => getProductKey(i) === productKey);
      if (exists) {
        return prev.map((i) =>
          getProductKey(i) === productKey
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...cartProduct, quantity: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((i) => !itemMatches(i, id)));
  }

  function increaseQuantity(id) {
    setCart((prev) =>
      prev.map((i) =>
        itemMatches(i, id) ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  }

  function decreaseQuantity(id) {
    setCart((prev) =>
      prev
        .map((i) =>
          itemMatches(i, id) ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function clearCart() {
    setCart([]);
  }

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, i) => sum + getPriceIncludingTax(i) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
