//File: components/ProductCard.jsx
import { ShoppingBag, Star } from "lucide-react";
import { useCartContext } from "../context/CartContext";

export default function ProductCard({ product }) {
  const { handleAddToCart } = useCartContext();

  // Data dummy jika props product tidak ada (buat preview komponen tanpa data asli)
  const item = product || {
    id: 1,
    name: "Beras Premium 5kg",
    price: 65000,
    category: "Food",
    rating: 4.8,
    stock: 10,
    is_promo: true,
    promo: 15,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=2070&auto=format&fit=crop",
  };

  const formatIDR = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Harga setelah dipotong promo (kalau produk lagi promo)
  const currentPrice = item.is_promo
    ? Math.round(item.price - item.price * (item.promo / 100))
    : item.price;

  const isOutOfStock = item.stock === 0;

  return (
    <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img
          src={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/product/${item.image}`) : 'https://placehold.co/300x300?text=No+Image'}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300?text=No+Image'; }}
        />
        {item.is_promo && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
            -{item.promo}%
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-grow">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          {item.category}
        </span>

        <h3 className="text-sm font-medium text-slate-800 line-clamp-2 mb-2 group-hover:text-green-600 transition-colors">
          {item.name}
        </h3>

        <div className="flex items-center gap-1 mb-2 text-amber-500">
          <Star className="w-3.5 h-3.5 fill-amber-500" />
          <span className="text-xs font-bold">{item.rating}</span>
        </div>

        <div className="mt-auto">
          {item.is_promo && (
            <span className="text-xs text-slate-400 line-through">
              {formatIDR(item.price)}
            </span>
          )}
          <div className="mt-1 mb-3">
            <span className="text-base font-bold text-green-600">
              {formatIDR(currentPrice)}
            </span>
          </div>

          <button
            onClick={() => handleAddToCart(item)}
            disabled={isOutOfStock}
            className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isOutOfStock
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border border-green-100"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            {isOutOfStock ? "Stok habis" : "Tambah ke keranjang"}
          </button>
        </div>
      </div>
    </div>
  );
}
