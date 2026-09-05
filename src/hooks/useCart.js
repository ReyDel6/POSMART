// File: src/hooks/useCart.js
import { useState, useCallback } from "react";
import { useLocalStorage } from './useLocalStorage';

export function useCart() {
    const [cart, setCart] = useLocalStorage('posmart', []);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const handleAddToCart = useCallback((product) => {
        setCart((currentCart) => {
            const existingItem = currentCart.find((item) => Number(item.id) === Number(product.id));
            if (existingItem) {
                return currentCart.map((item) =>
                    Number(item.id) === Number(product.id)
                        ? { ...item, qty: item.qty + 1 }
                        : item
                );
            }
            return [...currentCart, { ...product, qty: 1 }];
        });
    }, [setCart]);

    const handleRemoveItem = useCallback((id) => {
        setCart((currentCart) => currentCart.filter((item) => item.id !== id));
    }, [setCart]);

    const handleUpdateQty = useCallback((id, newQty) => {
        if (newQty <= 0) {
            handleRemoveItem(id);
            return;
        }
        setCart((currentCart) => currentCart.map((item) =>
            item.id === id ? { ...item, qty: newQty } : item
        ));
    }, [setCart, handleRemoveItem]);

    const totalCartItemsCount = cart.reduce((total, item) => total + item.qty, 0);

    const handleClearCart = useCallback(() => {
        setCart([]);
    }, [setCart]);

    return {
        cart,
        isCartOpen,
        setIsCartOpen,
        isOpenCart: isCartOpen,
        setIsOpenCart: setIsCartOpen,
        handleAddToCart,
        handleRemoveItem,
        handleUpdateQty,
        handleClearCart,
        totalCartItemsCount
    };
}