//File: components/CartModal.jsx
import { useState, useMemo } from "react";
import { useCartContext } from "../context/CartContext";
import { ArrowLeft, ShoppingBag, X } from "lucide-react";
import CheckoutForm from "./CheckoutForm";

export default function CartModal() {
    const { cartWithDetails: cart,
        isCartOpen,
        setIsCartOpen,
        handleAddToCart,
        handleRemoveItem,
        handleUpdateQty,
        totalCartItemsCount } = useCartContext();

    if (!isCartOpen) return null;

    const [isCheckout, setIsCheckout] = useState(false);
    
    const cartDetail = useMemo(() => {
        const items = cart.map(
            cartItem => {
                const price = Number(cartItem.price) || 0;
                const qty = Number(cartItem.qty) || 0;
                return {
                    ...cartItem, 
                    qty: qty,
                    subtotal: price * qty
                };
            }
        );

        const grandTotal = items.reduce((acc, item) => acc + item.subtotal, 0);

        return {items, grandTotal};
    }, [cart]);

    const handleCloseModal = () => {
        setIsCartOpen(false);
        setIsCheckout(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
            {/* Backdrop area  */}
            <div className="absolute inset-0" onClick={handleCloseModal}/>

            {/* Modal Area */}
            <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 animate-fade-in-left">

                {/* Header */}
                <div className="p-4 border-b border-slate100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isCheckout && (
                            <button
                                onClick={() => setIsCheckout(false)}
                                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition-color mr-1"
                                title="Kembali ke keranjang belanja"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        )}
                        <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">
                            {isCheckout ? 'Detail Checkout' : 'Keranjang Belanja '}
                        </h2>
                    </div>
                    <button
                        onClick={handleCloseModal}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                    >
                        <X className="w-5 h-5" /> 
                    </button>
                </div>

                {/* Modal content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isCheckout ? (
                        <CheckoutForm />
                    ) : (
                        <>
                            {cartDetail.items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-amber-600 gap-2">
                                    <ShoppingBag className="w-12 h-12 opacity-20" />
                                    <p>Keranjang belanja anda kosong.</p>
                                </div>
                            ) : (
                                cartDetail.items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/10">
                                        <img 
                                            src={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/product/${item.image}`) : 'https://placehold.co/100x100?text=No+Image'} 
                                            alt={item.name} 
                                            className="w-16 h-16 object-cover rounded-lg bg-white border border-slate-100"
                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=No+Image'; }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                                            <p className="text-xs font-mono font-bold text-red-600 mt-0.5"
                                            >
                                                Rp {(item.price || 0).toLocaleString('id-ID')}
                                            </p>

                                            {/* Qty changer & Subtotal */}
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                                        className="w-6 h-6 bg-white border border-slate-300 text-slate-700 font-bold rounded-md text-xs hover:border-red-500 cursor-pointer flex items-center justify-center select-none"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-xs font-mono font-bold text-slate-800 w-4 text-center">{item.qty}</span>
                                                    <button
                                                        onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                                        className="w-6 h-6 bg-white border border-slate-300 text-slate-700 font-bold rounded-md text-xs hover:border-red-500 cursor-pointer flex items-center justify-center select-none"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tighter">Subtotal</span>
                                                    <span className="text-xs font-bold text-slate-900">
                                                        Rp {item.subtotal.toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-[11px] font-bold text-red-700 px-2 py-1 rounded-md"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isCheckout && cartDetail.items.length > 0 && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500 ">Total Belanja</span>
                            <span className="text-lg font-mono font-black text-red-600">Rp {cartDetail.grandTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <button
                            onClick={() => setIsCheckout(true)}
                            className="w-full bg-green-600 hover:bg-green-800 text-white font-bold py-3 rounde-xl text-sm transition-colors shadow-xs cursor-pointer text-center"
                        >
                            Checkout Sekarang
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}