// File: context/CartContext.jsx
import { createContext, useContext } from "react";

export const CartContext = createContext(null);

/**
 * Hook to access cart context values.
 * Must be used inside a component tree wrapped by <CartProvider>.
 */
export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}