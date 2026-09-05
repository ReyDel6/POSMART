// File: context/CartProvider.jsx
import { useEffect } from "react";
import { CartContext } from "./CartContext";
import { useCart } from "../hooks/useCart";
import { useProduct } from "../hooks/useProduct";

export function CartProvider({ children }) {
    const cartTools = useCart();
    const productTools = useProduct();

    // Tarik semua produk sekali di awal (per_page besar, tanpa pagination)
    // supaya cart bisa cari detail produk (nama, harga, gambar) berdasarkan id.
    useEffect(() => {
        productTools.fetchProducts({ page: 1, per_page: 1000 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Gabungkan cart (cuma id + qty) dengan detail produk lengkap
    const cartWithDetails = cartTools.cart.map((item) => {
        const product = productTools.products.find(
            (p) => Number(p.id) === Number(item.id)
        );
        return product
            ? { ...product, qty: item.qty }
            : {
                ...item,
                qty: item.qty,
                name: item.name || 'Produk tidak ditemukan',
                price: item.price || 0,
            };
    });

    const contextValue = {
        ...cartTools,
        ...productTools,
        cartWithDetails,
    };

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
}