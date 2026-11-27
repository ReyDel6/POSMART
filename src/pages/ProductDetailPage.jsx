// File: src/pages/ProductDetailPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight, Minus, Plus, ShoppingBag, Star,
  RefreshCcw, Loader2, Heart, Share2, Check, Scale,
  Package
} from 'lucide-react';
import { useCartContext } from '../context/CartContext';
import api, { getAuthToken } from '../utils/api';

const imgSrc = (url) =>
  url && (url.startsWith('http') || url.startsWith('/'))
    ? url
    : (url ? `/product/${url}` : '');

export default function ProductDetailPage() {
  const { id } = useParams();
  const { handleAddToCart } = useCartContext();

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [product, setProduct]       = useState(null);
  const [storeSettings, setStoreSettings] = useState({});
  const [activeImage, setActiveImage] = useState('');
  const [qty, setQty]               = useState(1);

  // Wishlist state (persisted di localStorage)
  const [wishlisted, setWishlisted] = useState(false);

  // Share feedback
  const [copied, setCopied] = useState(false);

  // Review form state
  const [formRating, setFormRating]   = useState(5);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [reviewMsg, setReviewMsg]     = useState('');

  const formatIDR = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const formatWeight = (grams) => {
    if (!grams) return null;
    return grams >= 1000
      ? `${(grams / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`
      : `${grams.toLocaleString('id-ID')} gram`;
  };

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [detailRes, settingsRes] = await Promise.all([
        api.get(`/get.product.php?id=${id}`),
        api.get('/public/settings.php'),
      ]);
      if (detailRes.data && detailRes.data.status === 'success') {
        const data = detailRes.data.data;
        setProduct(data);
        setActiveImage(data.image || '');
      } else {
        setError(detailRes.data?.message || 'Produk tidak ditemukan.');
      }
      if (settingsRes.data?.status === 'success') {
        setStoreSettings(settingsRes.data.data || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat detail produk.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Init wishlist dari localStorage
  useEffect(() => {
    try {
      const wl = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlisted(wl.includes(Number(id)));
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => { setQty(1); }, [id]);

  const toggleWishlist = () => {
    setWishlisted(prev => {
      const next = !prev;
      try {
        const wl = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const updated = next
          ? [...new Set([...wl, Number(id)])]
          : wl.filter(x => x !== Number(id));
        localStorage.setItem('wishlist', JSON.stringify(updated));
      } catch { /* ignore */ }
      return next;
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* user dismissed */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Memuat produk...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-4 text-center">
        <h3 className="font-bold text-slate-600 text-lg">⚠️ {error || 'Produk tidak ditemukan.'}</h3>
        <Link to="/" className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const currentPrice = product.is_promo
    ? Math.round(product.price - product.price * (product.promo / 100))
    : product.price;
  const isOutOfStock = product.stock === 0;

  // Gabungkan foto utama + galeri, buang duplikat
  const images = [...new Set([product.image, ...(product.gallery || [])].filter(Boolean))];

  const isLoggedIn = !!getAuthToken();
  const storeName  = storeSettings.store_name || 'POSMart';

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!formComment.trim()) return;
    setSubmitting(true);
    setReviewMsg('');
    try {
      const response = await api.post('/product/review.php', {
        product_id: product.id,
        rating: Number(formRating),
        comment: formComment.trim(),
      });
      if (response.data && response.data.status === 'success') {
        setFormComment('');
        setFormRating(5);
        setReviewMsg(response.data.message || 'Ulasan berhasil disimpan!');
        fetchDetail();
      }
    } catch (err) {
      setReviewMsg('⚠️ ' + (err.response?.data?.message || 'Gagal menyimpan ulasan.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Label badge di sudut gambar
  const isNew = !product.is_promo && product.reviews_count === 0;

  return (
    <div className="min-h-screen bg-cream pb-16">

      {/* ===== TOP BAR + BREADCRUMBS ===== */}
      <div className="bg-white border-b-2 border-ink sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          {/* Breadcrumbs */}
          <nav aria-label="breadcrumb" className="flex items-center flex-wrap gap-1 text-xs font-semibold text-slate-500">
            <Link to="/catalog" className="hover:text-coral transition-colors shrink-0">
              {storeName}
            </Link>
            <ChevronRight className="w-3 h-3 shrink-0 text-slate-400" />
            <Link
              to={`/catalog?category=${encodeURIComponent(product.category)}`}
              className="hover:text-coral transition-colors shrink-0"
            >
              {product.category}
            </Link>
            <ChevronRight className="w-3 h-3 shrink-0 text-slate-400" />
            <span className="text-ink font-black truncate max-w-[180px] sm:max-w-xs">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ===== GALLERY ===== */}
        <div className="space-y-3">
          {/* Foto utama — badge di corner gambar */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-white border-2 border-ink shadow-[6px_6px_0_#161616] relative">
            {/* Badge diskon */}
            {product.is_promo && (
              <div className="absolute top-3 left-3 z-10 bg-coral text-white text-xs font-black px-2.5 py-1 rounded-md shadow-[2px_2px_0_#161616]">
                -{product.promo}%
              </div>
            )}
            {/* Badge "Baru" — hanya jika belum ada ulasan dan bukan promo */}
            {isNew && (
              <div className="absolute top-3 left-3 z-10 bg-lime text-ink text-xs font-black px-2.5 py-1 rounded-md border border-ink shadow-[2px_2px_0_#161616]">
                🌟 Baru
              </div>
            )}
            <img
              src={imgSrc(activeImage)}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x600?text=No+Image'; }}
            />
          </div>

          {/* Thumbnail galeri */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImage === img
                      ? 'border-ink ring-2 ring-lime shadow-[2px_2px_0_#161616]'
                      : 'border-ink/30 hover:border-ink'
                  }`}
                  aria-label={`Foto produk ${idx + 1}`}
                >
                  <img src={imgSrc(img)} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== INFO ===== */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border-2 border-ink shadow-[6px_6px_0_#161616] p-6 space-y-4">

            {/* Kategori + Nama */}
            <div>
              <span className="inline-block bg-lime text-ink border border-ink px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider">
                {product.category}
              </span>
              <h1 className="text-2xl font-black text-ink leading-tight mt-2">{product.name}</h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-500" />
                {Number(product.rating) > 0 ? Number(product.rating).toFixed(1) : 'Baru'}
              </span>
              {product.reviews_count > 0 && (
                <a href="#ulasan" className="text-slate-500 text-xs hover:text-emerald-700">
                  · {product.reviews_count} ulasan
                </a>
              )}
            </div>

            {/* Harga */}
            <div className="flex items-end gap-3">
              <span className={`font-black ${product.is_promo ? 'text-coral' : 'text-ink'} text-3xl`}>
                {formatIDR(currentPrice)}
              </span>
              {product.is_promo && (
                <span className="text-slate-400 line-through text-lg mb-0.5">{formatIDR(product.price)}</span>
              )}
            </div>

            {/* Stok + Berat */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
              {isOutOfStock ? (
                <span className="text-red-700 bg-red-50 border-2 border-ink px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Stok habis
                </span>
              ) : (
                <span className="text-ink bg-lime border-2 border-ink px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Stok: {product.stock} pcs
                </span>
              )}
              {product.weight && (
                <span className="text-slate-600 bg-slate-100 border-2 border-ink/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> {formatWeight(product.weight)}
                </span>
              )}
            </div>

            {/* Deskripsi Produk */}
            {product.description && (
              <div className="pt-3 border-t-2 border-ink/10">
                <h3 className="text-xs font-black text-ink uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-lime border border-ink flex items-center justify-center text-[10px]">📋</span>
                  Deskripsi Produk
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Qty + Action Buttons */}
            <div className="pt-2 space-y-3">
              {/* Qty selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-ink">Jumlah</span>
                <div className="flex items-center border-2 border-ink rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2 bg-cream hover:bg-lime text-ink cursor-pointer transition-colors"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-black text-sm">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.min(Math.max(product.stock, 1), q + 1))}
                    className="px-3 py-2 bg-cream hover:bg-lime text-ink cursor-pointer transition-colors"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tombol aksi utama + wishlist + share */}
              <div className="flex gap-2">
                {/* Tambah ke Keranjang */}
                <button
                  onClick={() => handleAddToCart({ ...product, id: product.id, price: currentPrice, image: product.image })}
                  disabled={isOutOfStock}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all border-2 border-ink cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-ink text-cream hover:bg-slate-900 shadow-[4px_4px_0_#161616]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-lime shrink-0" />
                  {isOutOfStock ? 'Stok Habis' : 'Tambah ke Keranjang'}
                </button>

                {/* Wishlist */}
                <button
                  type="button"
                  onClick={toggleWishlist}
                  aria-label={wishlisted ? 'Hapus dari wishlist' : 'Simpan ke wishlist'}
                  className={`w-12 h-12 rounded-xl border-2 border-ink flex items-center justify-center transition-all cursor-pointer shadow-[3px_3px_0_#161616] shrink-0 ${
                    wishlisted
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-slate-400 hover:bg-red-50 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${wishlisted ? 'fill-white' : ''}`} />
                </button>

                {/* Share / Salin link */}
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Bagikan produk"
                  className="w-12 h-12 rounded-xl border-2 border-ink bg-white flex items-center justify-center hover:bg-lime transition-all cursor-pointer shadow-[3px_3px_0_#161616] shrink-0 relative"
                >
                  {copied
                    ? <Check className="w-5 h-5 text-emerald-600" />
                    : <Share2 className="w-5 h-5 text-ink" />
                  }
                </button>
              </div>

              {copied && (
                <p className="text-[11px] text-emerald-600 font-semibold text-center">
                  ✓ Link produk berhasil disalin!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== ULASAN ===== */}
      <div id="ulasan" className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="bg-white rounded-2xl border-2 border-ink shadow-[6px_6px_0_#161616] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black text-ink flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-lime border-2 border-ink flex items-center justify-center">
                <Star className="w-5 h-5 text-ink fill-ink" />
              </span>
              Ulasan Pembeli
              {product.reviews_count > 0 && (
                <span className="text-sm font-black text-slate-400">({product.reviews_count})</span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <Star className="w-4 h-4 fill-amber-500" />
              {Number(product.rating) > 0 ? Number(product.rating).toFixed(1) : 'Belum ada nilai'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List ulasan */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {!product.reviews || product.reviews.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">
                  Belum ada ulasan. Jadilah yang pertama!
                </div>
              ) : (
                product.reviews.map((review) => (
                  <div key={review.id} className="flex gap-3 border-b border-slate-100 pb-4">
                    <div className="w-9 h-9 rounded-full bg-lime text-ink border-2 border-ink font-black flex items-center justify-center text-xs shrink-0">
                      {(review.user_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {review.user_name}
                          {review.is_mine && (
                            <span className="ml-1 text-[10px] text-emerald-600">(Anda)</span>
                          )}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">{review.created_at}</span>
                      </div>
                      <div className="flex items-center gap-0.5 my-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= Number(review.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Form ulasan */}
            <div className="lg:border-l lg:border-slate-100 lg:pl-6">
              {reviewMsg && (
                <div className={`text-sm p-3 rounded-xl mb-3 font-medium ${
                  reviewMsg.startsWith('⚠️')
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {reviewMsg}
                </div>
              )}

              {!isLoggedIn ? (
                <Link
                  to={`/login?redirect=/product/${product.id}`}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center justify-center cursor-pointer"
                >
                  Masuk untuk memberi ulasan
                </Link>
              ) : !product.can_review ? (
                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  Ulasan hanya bisa diberikan oleh pembeli yang sudah membeli produk ini. Setelah pesanan berstatus dibayar, kamu bisa menilai di sini.
                </p>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <p className="text-xs font-bold text-slate-600">Penilaian Anda</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        aria-label={`${star} bintang`}
                        className="cursor-pointer p-0.5"
                      >
                        <Star className={`w-7 h-7 ${star <= Number(formRating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-slate-500">{Number(formRating)}/5</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    placeholder="Bagaimana kualitas produk ini?"
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all bg-slate-50/50 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !formComment.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? 'Menyimpan...' : 'Kirim Ulasan'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
