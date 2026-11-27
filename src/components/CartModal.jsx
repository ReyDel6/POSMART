//File: components/CartModal.jsx
import { useState, useMemo, useEffect } from "react";
import { useCartContext } from "../context/CartContext";
import { usePromotions } from "../hooks/usePromotions";
import { linePrice, bundleLinePrice } from "../utils/pricing";
import { ArrowLeft, ShoppingBag, X, Trash2, Pencil, Truck } from "lucide-react";
import api from "../utils/api";
import CheckoutForm from "./CheckoutForm";
import useDialog from "../hooks/useDialog";

export default function CartModal() {
    const { cartWithDetails: cart,
        isCartOpen,
        setIsCartOpen,
        handleRemoveItem,
        handleUpdateQty,
        handleUpdateNote } = useCartContext();

    const { byProduct: dealMap, byBundleId: bundleMap } = usePromotions();
    const [isCheckout, setIsCheckout] = useState(false);
    const [freeShippingMinimum, setFreeShippingMinimum] = useState(0);
    const [editingNote, setEditingNote] = useState(null);

    useEffect(() => {
        api.get('/shipping_zones.php')
            .then(({ data }) => {
                const zones = Array.isArray(data?.data) ? data.data : [];
                const minimums = zones.map((zone) => Number(zone.free_shipping_minimum) || 0).filter(Boolean);
                setFreeShippingMinimum(minimums.length ? Math.min(...minimums) : 0);
            })
            .catch(() => setFreeShippingMinimum(0));
    }, []);

    const cartDetail = useMemo(() => {
        const items = cart.map(
            cartItem => {
                const qty = Number(cartItem.qty) || 0;
                if (cartItem.bundle_id) {
                    const b = bundleMap[String(cartItem.bundle_id)];
                    const lp = bundleLinePrice(b || { bundle_price: cartItem.price, list_total: cartItem.price }, qty);
                    return { ...cartItem, qty, subtotal: lp.total, discount: lp.discount, label: lp.label, unitPrice: lp.unit, basePrice: Number(b?.list_total || cartItem.price) || 0 };
                }
                const deal = dealMap[cartItem.id];
                const lp = linePrice(cartItem, qty, deal);
                return {
                    ...cartItem,
                    qty,
                    subtotal: lp.total,
                    discount: lp.discount,
                    label: lp.label,
                    unitPrice: lp.unit,
                    basePrice: Number(cartItem.price) || 0,
                };
            }
        );

        const grandTotal = items.reduce((acc, item) => acc + item.subtotal, 0);
        const totalDiscount = items.reduce((acc, item) => acc + item.discount, 0);

        return {items, grandTotal, totalDiscount};
    }, [cart, dealMap, bundleMap]);

    const remainingForFreeShipping = Math.max(0, freeShippingMinimum - cartDetail.grandTotal);
    const shippingProgress = freeShippingMinimum > 0 ? Math.min(100, (cartDetail.grandTotal / freeShippingMinimum) * 100) : 0;

    const handleCloseModal = () => {
        setIsCartOpen(false);
        setIsCheckout(false);
    };

    useDialog(isCartOpen, handleCloseModal);

    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
            {/* Backdrop area  */}
            <div className="absolute inset-0" onClick={handleCloseModal}/>

            {/* Modal Area */}
            <div role="dialog" aria-modal="true" className="relative w-full max-w-md h-full bg-white border-l-2 border-ink shadow-[-6px_0_0_#161616] flex flex-col z-10 animate-fade-in-left">

                {/* Header */}
                <div className="p-4 border-b-2 border-ink flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isCheckout && (
                            <button
                                onClick={() => setIsCheckout(false)}
                                className="p-1 hover:bg-lime rounded-lg cursor-pointer transition-color mr-1"
                                title="Kembali ke keranjang belanja"
                            >
                                <ArrowLeft className="w-5 h-5 text-ink" />
                            </button>
                        )}
                        <h2 className="font-black text-lg text-ink tracking-tight">
                            {isCheckout ? 'Detail Checkout' : 'Keranjang Belanja '}
                        </h2>
                    </div>
                    <button
                        onClick={handleCloseModal}
                        className="p-1.5 hover:bg-lime text-ink rounded-lg cursor-pointer transition-colors"
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
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-ink gap-2">
                                    <ShoppingBag className="w-12 h-12 text-ink opacity-20" />
                                    <p>Keranjang belanja anda kosong.</p>
                                </div>
                            ) : (
                                <>
                                {freeShippingMinimum > 0 && (
                                    <div className="rounded-xl border-2 border-ink bg-lime/40 p-3 shadow-[2px_2px_0_#161616]">
                                        <div className="flex items-center gap-2 text-xs font-black text-ink"><Truck className="h-4 w-4" />{remainingForFreeShipping > 0 ? <>Tambah <strong>Rp {remainingForFreeShipping.toLocaleString('id-ID')}</strong> lagi untuk gratis ongkir!</> : 'Selamat, kamu mendapatkan gratis ongkir!'}</div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full border border-ink bg-white"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${shippingProgress}%` }} /></div>
                                    </div>
                                )}
                                {cartDetail.items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 border-2 border-ink rounded-xl bg-white shadow-[3px_3px_0_#161616]">
                                        <img 
                                            src={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/product/${item.image}`) : 'https://placehold.co/100x100?text=No+Image'} 
                                            alt={item.name} 
                                            className="w-16 h-16 object-cover rounded-lg bg-[#EFEFE6] border-2 border-ink"
                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=No+Image'; }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-black text-ink truncate">{item.name}</h4>
                                            {item.label && (
                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-coral text-white border border-ink rounded text-[9px] font-black tracking-tight shadow-[1px_1px_0_#161616]">
                                                    {item.label}
                                                </span>
                                            )}
                                            <button type="button" onClick={() => setEditingNote(editingNote === item.id ? null : item.id)} className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-ink"><Pencil className="h-3 w-3" />{item.note ? 'Edit catatan' : 'Tulis catatan'}</button>
                                            {editingNote === item.id && <textarea value={item.note || ''} onChange={(event) => handleUpdateNote(item.id, event.target.value)} placeholder="Contoh: pilihkan tanggal kedaluwarsa paling lama" maxLength={200} rows={2} className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-2 py-1 text-[11px]" />}
                                            {item.discount > 0 ? (
                                                <p className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-mono line-through">
                                                        Rp {(item.basePrice * item.qty).toLocaleString('id-ID')}
                                                    </span>
                                                    <span className="text-xs font-mono font-black text-ink">
                                                        Rp {item.unitPrice.toLocaleString('id-ID')}
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className="text-xs font-mono font-black text-ink mt-0.5">
                                                    Rp {(item.basePrice || 0).toLocaleString('id-ID')}
                                                </p>
                                            )}

                                            {/* Qty changer & Subtotal */}
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                                        className="w-6 h-6 bg-white border-2 border-ink text-ink font-black rounded-md text-xs hover:bg-lime cursor-pointer flex items-center justify-center select-none"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.qty}
                                                        onChange={(event) => {
                                                            const value = Number(event.target.value);
                                                            if (Number.isFinite(value) && value >= 1) handleUpdateQty(item.id, Math.floor(value));
                                                        }}
                                                        aria-label={`Jumlah ${item.name}`}
                                                        className="h-6 w-12 rounded-md border-2 border-ink bg-white text-center text-xs font-mono font-black text-ink"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                                        className="w-6 h-6 bg-white border-2 border-ink text-ink font-black rounded-md text-xs hover:bg-lime cursor-pointer flex items-center justify-center select-none"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-400 block uppercase font-black tracking-tighter">Subtotal</span>
                                                    <span className="text-xs font-black text-ink">
                                                        Rp {item.subtotal.toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            aria-label={`Hapus ${item.name}`}
                                            title="Hapus produk"
                                            className="self-start rounded-lg border-2 border-coral p-1.5 text-coral hover:bg-red-50 cursor-pointer"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isCheckout && cartDetail.items.length > 0 && (
                    <div className="p-4 border-t-2 border-ink bg-cream space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-black text-ink">Total Belanja</span>
                            <span className="text-lg font-mono font-black text-ink">Rp {cartDetail.grandTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Belum termasuk ongkir &amp; biaya layanan</p>
                        {cartDetail.totalDiscount > 0 && (
                            <div className="flex justify-between items-center text-xs font-black text-coral">
                                <span>Kamu hemat</span>
                                <span className="font-mono">-Rp {cartDetail.totalDiscount.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsCheckout(true)}
                            className="w-full bg-ink hover:bg-slate-900 text-cream font-black py-3 rounded-xl text-sm border-2 border-ink shadow-[4px_4px_0_#161616] transition-colors cursor-pointer text-center"
                        >
                            Checkout Sekarang
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}