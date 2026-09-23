//File: components/ProductCard.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Star, X, ZoomIn, MessageCircle } from "lucide-react";
import { useCartContext } from "../context/CartContext";
import useDialog from "../hooks/useDialog";
import api from "../utils/api";

export default function ProductCard({ product, storeSettings }) {
  const { handleAddToCart } = useCartContext();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ rating: 0, count: 0, can_review: false, my_rating: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useDialog(zoomOpen, () => setZoomOpen(false));
  useDialog(reviewsOpen, () => setReviewsOpen(false));

  // Data dummy jika props product tidak ada (buat preview komponen tanpa data asli)
  const item = product || {
    id: 1,
    name: "Beras Premium 5kg",
    price: 65000,
    category: "Food",
    rating: 4.8,
    reviews_count: 0,
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

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const response = await api.get(`/product_reviews.php?product_id=${item.id}`);
      if (response.data && response.data.status === 'success') {
        setReviews(response.data.data.reviews || []);
        setReviewMeta({
          rating: response.data.data.rating,
          count: response.data.data.count,
          can_review: response.data.data.can_review,
          my_rating: response.data.data.my_rating,
        });
      }
    } catch (err) {
      setReviewsError(err.response?.data?.message || 'Gagal memuat ulasan.');
    } finally {
      setReviewsLoading(false);
    }
  }, [item.id]);

  const openReviews = () => {
    setReviewsOpen(true);
    fetchReviews();
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!formComment.trim()) return;
    setSubmitting(true);
    setReviewsError('');
    try {
      const response = await api.post('/product/review.php', {
        product_id: item.id,
        rating: Number(formRating),
        comment: formComment.trim(),
      });
      if (response.data && response.data.status === 'success') {
        setFormComment('');
        setFormRating(5);
        await fetchReviews();
        alert(response.data.message || 'Ulasan berhasil disimpan. Terima kasih!');
      }
    } catch (err) {
      setReviewsError(err.response?.data?.message || 'Gagal menyimpan ulasan.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoggedIn = !!localStorage.getItem('token');
  const ratingDisplay = Number(item.rating) || reviewMeta.rating || 0;

  return (
    <div className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300 flex flex-col h-full">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Link
          to={`/product/${item.id}`}
          aria-label={`Lihat detail ${item.name}`}
          className="block w-full h-full group/img focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <img
            src={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/product/${item.image}`) : 'https://placehold.co/300x300?text=No+Image'}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300?text=No+Image'; }}
          />
        </Link>
        {!isOutOfStock && item.is_promo && (
          <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
            -{item.promo}%
          </div>
        )}
        {!isOutOfStock && !item.is_promo && item.deal && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
            {item.deal.label}
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 bg-gray-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
            Stok habis
          </div>
        )}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label={`Perbesar gambar ${item.name}`}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-white/90 text-slate-600 shadow-md hover:bg-white transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom lightbox */}
      {zoomOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setZoomOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={`Gambar ${item.name}`} className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              aria-label="Tutup zoom gambar"
              className="absolute -top-4 -right-4 z-10 p-2 rounded-full bg-white text-slate-700 shadow-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/product/${item.image}`) : 'https://placehold.co/300x300?text=No+Image'}
              alt={item.name}
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl bg-white"
            />
            <p className="mt-3 text-center text-sm font-medium text-white">{item.name}</p>
          </div>
        </div>
      )}

      {/* Ulasan modal */}
      {reviewsOpen && (
        <div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReviewsOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Ulasan ${item.name}`}
            className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/product/${item.image}`) : 'https://placehold.co/300x300?text=No+Image'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x300?text=No+Image'; }}
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {Number(ratingDisplay).toFixed(1)}
                    </span>
                    <span>· {reviewMeta.count} ulasan</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewsOpen(false)}
                aria-label="Tutup ulasan"
                className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {reviewsError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{reviewsError}</div>
              )}

              {reviewsLoading ? (
                <div className="text-center py-10 text-sm text-slate-400 font-semibold">Memuat ulasan...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Star className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-500">Belum ada ulasan</p>
                  <p className="text-xs text-slate-400">Jadilah yang pertama memberi penilaian untuk produk ini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review, idx) => (
                    <div key={review.id || idx} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {(review.user_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate">{review.user_name}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{review.created_at}</span>
                        </div>
                        <div className="flex items-center gap-0.5 my-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-3 h-3 ${star <= Number(review.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                          ))}
                        </div>
                        {review.comment && <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-5 bg-slate-50 shrink-0">
              {isLoggedIn && reviewMeta.can_review ? (
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-1.5">Penilaian Anda</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} type="button" onClick={() => setFormRating(star)} aria-label={`${star} bintang`} className="cursor-pointer p-0.5">
                          <Star className={`w-6 h-6 ${star <= Number(formRating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-bold text-slate-500">{Number(formRating)}/5</span>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    placeholder="Bagaimana kualitas produk ini?"
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all bg-white resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !formComment.trim()}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Menyimpan...' : 'Kirim Ulasan'}
                  </button>
                </form>
              ) : isLoggedIn ? (
                <p className="text-center text-xs text-slate-500">Ulasan hanya bisa diberikan oleh pembeli yang sudah menerima pesanan produk ini.</p>
              ) : (
                <button
                  onClick={() => { window.location.href = `/login?redirect=/`; }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Masuk untuk memberi ulasan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-grow">
        <span className="self-start inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2">
          {item.category}
        </span>

        <Link
          to={`/product/${item.id}`}
          className="text-sm font-medium text-slate-800 line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors hover:underline"
        >
          {item.name}
        </Link>

        <button
          type="button"
          onClick={openReviews}
          title="Lihat ulasan pembeli"
          className="flex items-center gap-1 mb-2 text-amber-500 hover:text-amber-600 transition-colors cursor-pointer self-start"
        >
          <Star className="w-3.5 h-3.5 fill-amber-500" />
          <span className="text-xs font-bold">{ratingDisplay > 0 ? Number(ratingDisplay).toFixed(1) : ''}</span>
          {ratingDisplay <= 0 && <span className="inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">Baru</span>}
          {item.reviews_count > 0 && <span className="text-[10px] text-slate-400 font-medium">({item.reviews_count})</span>}
        </button>

        <div className="mt-auto">
          {item.is_promo && (
            <span className="text-xs text-slate-400 line-through">
              {formatIDR(item.price)}
            </span>
          )}
          <div className="mt-1 mb-3">
            <span className="text-base font-bold text-emerald-600">
              {formatIDR(currentPrice)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleAddToCart(item)}
              disabled={isOutOfStock}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isOutOfStock
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock ? "Stok habis" : "Tambah ke keranjang"}
            </button>

            {!isOutOfStock && storeSettings?.whatsapp && (
              <a
                href={`https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent(
                  `Halo, saya ingin memesan produk *${item.name}* seharga ${formatIDR(currentPrice)}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Pesan via WA
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}