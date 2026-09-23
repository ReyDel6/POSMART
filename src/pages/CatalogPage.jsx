//File: pages/CatalogPage.jsx
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "../components/Header";
import CartModal from "../components/CartModal";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import {
    Percent,
    RotateCcw,
    ArrowRight,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Clock,
    Flame,
    TrendingUp,
    PackageSearch,
    Search,
    Package,
    SearchCheck,
    ChevronRight as ChevronRightIcon,
    Star,
    X,
    History,
    Zap,
    Truck,
    ShieldCheck,
} from "lucide-react";
import { useProduct } from "../hooks/useProduct";
import { usePromotions } from "../hooks/usePromotions";
import { useCartContext } from "../context/CartContext";
import api from "../utils/api";

const STEP_VALUE = 500;

// Ikon kategori (nuansa alfamart grocery)
const CATEGORY_ICONS = {
    'Food': { icon: '🍚', color: 'bg-orange-100' },
    'Beverage': { icon: '🧋', color: 'bg-sky-100' },
    'Personal Care': { icon: '🧴', color: 'bg-rose-100' },
    'Household': { icon: '🧹', color: 'bg-violet-100' },
    'Snack': { icon: '🍪', color: 'bg-amber-100' },
    'Frozen': { icon: '🧊', color: 'bg-cyan-100' },
    'Milk': { icon: '🥛', color: 'bg-emerald-100' },
    'Baby': { icon: '🍼', color: 'bg-pink-100' },
    'Pets': { icon: '🐾', color: 'bg-lime-100' },
    'Tobacco': { icon: '🚬', color: 'bg-stone-100' },
};
const FALLBACK_ICON = { icon: '📦', color: 'bg-slate-100' };

const categoryLookup = (name) => CATEGORY_ICONS[name] || FALLBACK_ICON;

const formatIDR = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// Foto cadangan untuk banner carousel agar tetap tampil premium walau tanpa gambar produk
const BANNER_IMG_FALLBACK = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

export default function CatalogPage() {

    const { products, loading, error, pagination, fetchProducts } = useProduct();
    const [categories, setCategories] = useState(['All']);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [storeSettings, setStoreSettings] = useState({});
    const [popularProducts, setPopularProducts] = useState([]);
    const [newestProducts, setNewestProducts] = useState([]);
    const [popularLoading, setPopularLoading] = useState(true);

    const [onlyPromo, setOnlyPromo] = useState(false);
    const [sortBy, setSortBy] = useState('none');
    const [userMaxPrice, setUserMaxPrice] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const currentPage = parseInt(searchParams.get('page')) || 1;
    const currentSearch = searchParams.get('search') || '';
    const currentCategory = searchParams.get('category') || "All";

    // ===== Daftar kategori dari backend =====
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await api.get('/get.product.php?categories=1');
                if (response.data && response.data.status === 'success') {
                    setCategories(['All', ...response.data.data]);
                }
            } catch (err) {
                setCategories(['All', 'Food', 'Beverage', 'Personal Care']);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    // ===== Settings toko (lokasi, WA) =====
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/public/settings.php');
                if (response.data && response.data.status === 'success') {
                    setStoreSettings(response.data.data || {});
                }
            } catch (err) {
                console.error('gagal memuat settings:', err);
            }
        };
        fetchSettings();
    }, []);

    // ===== Section "Paling Laris" + "Baru" =====
    useEffect(() => {
        let active = true;
        Promise.all([
            api.get('/get.product.php?sort=popular&per_page=8'),
            api.get('/get.product.php?sort=newest&per_page=8'),
        ])
            .then(([popular, newest]) => {
                if (!active) return;
                if (popular.data?.status === 'success') setPopularProducts(popular.data.data || []);
                if (newest.data?.status === 'success') setNewestProducts(newest.data.data || []);
            })
            .catch(() => {})
            .finally(() => { if (active) setPopularLoading(false); });
        return () => { active = false; };
    }, []);

    const { MIN_PRICE_LIMIT } = useMemo(() => {
        const allPrices = products ? products.map(p => p.price) : [];
        return { MIN_PRICE_LIMIT: Math.floor((allPrices.length > 0 ? Math.min(...allPrices) : 0) / STEP_VALUE) };
    }, [products]);

    const currentMaxLimit = useMemo(() => {
        if (!products || products.length === 0) return MIN_PRICE_LIMIT;
        const activeProducts = products.filter(p => {
            const matchCategory = currentCategory === 'All' || p.category === currentCategory;
            const macthPromo = !onlyPromo || p.is_promo;
            return matchCategory && macthPromo;
        });
        if (activeProducts.length > 0) {
            const highestPrice = Math.max(...activeProducts.map(p => p.price));
            return Math.ceil(highestPrice / STEP_VALUE) * STEP_VALUE;
        }
        return MIN_PRICE_LIMIT;
    }, [products, currentCategory, onlyPromo, MIN_PRICE_LIMIT]);

    const effectiveMaxPrice = userMaxPrice !== null ? userMaxPrice : currentMaxLimit;

    const filteredProduct = useMemo(() => {
        if (!products) return [];
        let result = products.filter((product) => {
            const matchCategory = currentCategory === 'All' || product.category === currentCategory;
            const matchPrice = product.price <= effectiveMaxPrice;
            const matchPromo = !onlyPromo || product.is_promo;
            return matchCategory && matchPrice && matchPromo;
        });
        if (sortBy === 'asc') result.sort((a, b) => a.price - b.price);
        else if (sortBy === 'desc') result.sort((a, b) => b.price - a.price);
        return result;
    }, [products, currentCategory, effectiveMaxPrice, onlyPromo, sortBy]);

    const promoProducts = useMemo(() => (products ? products.filter(p => p.is_promo) : []), [products]);

    const { bundles } = usePromotions();
    const { handleAddToCart } = useCartContext();

    useEffect(() => {
        fetchProducts({ page: currentPage, search: currentSearch, category: currentCategory });
    }, [currentPage, currentSearch, currentCategory, fetchProducts]);

    const handleCategoryChange = useCallback((category) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', '1');
        if (category === 'All') newParams.delete('category');
        else newParams.set('category', category);
        setSearchParams(newParams);
        setUserMaxPrice(null);
    }, [searchParams, setSearchParams]);

    const handlePromoToggle = useCallback((e) => {
        setOnlyPromo(e.target.checked);
        setUserMaxPrice(null);
    }, []);

    const handlePageChange = useCallback((page) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', String(page));
        setSearchParams(newParams);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [searchParams, setSearchParams]);

    // ===== Bantuan pencarian (M5) =====
    const recentSearches = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('recent_searches') || '[]');
        } catch (e) {
            return [];
        }
    }, [currentSearch]);

    const hotKeywords = recentSearches.length > 0
        ? recentSearches
        : ['Aqua', 'Indomie', 'Susu UHT', 'Teh', 'Beras', 'Minyak'];

    const setTerm = (term) => {
        const q = String(term || '').trim();
        if (!q) return;
        try {
            const list = JSON.parse(localStorage.getItem('recent_searches') || '[]')
                .filter(x => x.toLowerCase() !== q.toLowerCase());
            list.unshift(q);
            localStorage.setItem('recent_searches', JSON.stringify(list.slice(0, 6)));
        } catch (e) { }
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', '1');
        newParams.delete('category');
        newParams.set('search', q);
        setSearchParams(newParams);
        setUserMaxPrice(null);
    };

    const clearTerm = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('search');
        newParams.set('page', '1');
        newParams.delete('category');
        setSearchParams(newParams);
        setUserMaxPrice(null);
    };

    // Auto-scroll ke hasil saat user mulai mengetik di header
    const prevSearch = useRef(currentSearch);
    useEffect(() => {
        if (prevSearch.current !== currentSearch && currentSearch !== '') {
            document.getElementById('katalog-produk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        prevSearch.current = currentSearch;
    }, [currentSearch]);

    // ===== CAROUSEL =====
    const banners = useMemo(() => {
        if (promoProducts.length > 0) return promoProducts.slice(0, 5);
        return [
            { name: 'Belanja Sembako Segar', subtitle: 'Harga grosir langsung dari toko terdekat', color: 'from-emerald-700 via-emerald-600 to-teal-700', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80' },
            { name: 'Produk Fresh Setiap Hari', subtitle: 'Dicek kualitasnya setiap pagi', color: 'from-amber-600 via-orange-600 to-red-500', image: 'https://images.unsplash.com/photo-1540331547168-8b63109225b7?auto=format&fit=crop&w=600&q=80' },
            { name: 'Antar Cepat Sampai Tujuan', subtitle: 'Pengiriman sesuai zona ongkir', color: 'from-sky-700 via-blue-600 to-indigo-700', image: 'https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fit=crop&w=600&q=80' },
        ];
    }, [promoProducts]);

    const [bannerIndex, setBannerIndex] = useState(0);
    const bannerTimer = useRef(null);
    useEffect(() => {
        setBannerIndex(i => (banners.length > 0 ? Math.min(i, banners.length - 1) : 0));
        bannerTimer.current = setInterval(() => {
            setBannerIndex(i => (i + 1) % banners.length);
        }, 5000);
        return () => clearInterval(bannerTimer.current);
    }, [banners.length]);

    const goBanner = (i) => setBannerIndex(((i % banners.length) + banners.length) % banners.length);

    const bannerIsProduct = !!banners[0]?.id;
    const activeBanner = banners[bannerIndex] || banners[0];
    const promoPrice = activeBanner?.is_promo ? Math.round(activeBanner.price - activeBanner.price * (activeBanner.promo / 100)) : 0;

    // ===== Countdown flash sale =====
    const [countdown, setCountdown] = useState({ h: '00', m: '00', s: '00' });
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            const diff = Math.max(0, end - now);
            const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            setCountdown({ h, m, s });
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <div className="w-8 h-8 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-500 tracking-wide animate-pulse">
                    Menghubungkan ke database posmart....
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3 px-4 text-center">
                <span className="text-4xl">⚠️</span>
                <h3 className="font-bold text-slate-500 text-lg">Gagal memuat toko</h3>
                <p className="text-sm text-slate-600">{error}</p>
                <button
                    onClick={() => fetchProducts({ page: currentPage, search: currentSearch, category: currentCategory })}
                    className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                    Coba lagi
                </button>
            </div>
        );
    }

    const sectionHeading = (icon, title, link) => (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    {icon}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{title}</h3>
            </div>
            <Link to={link} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors">
                Lihat Semua <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
        </div>
    );

    const productScroller = (list, loadingState) => (
        <div className={loadingState ? "flex items-center justify-center py-16" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"}>
            {loadingState ? (
                <div className="w-8 h-8 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : list.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 col-span-full">Belum ada produk.</p>
            ) : (
                list.map(p => (
                    <ProductCard key={p.id} product={p} storeSettings={storeSettings} />
                ))
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            <Header />

            {/* ===== BAR LOKASI TOKO (ala alfagift) ===== */}
            <div className="bg-emerald-700 text-white sticky top-[65px] z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
                    <button onClick={() => window.location.hash = '#katalog-produk'} className="flex items-center gap-2 text-left cursor-pointer hover:opacity-80 transition-opacity">
                        <MapPin className="w-4 h-4 shrink-0 text-amber-300" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wide">Kirim ke</p>
                            <p className="text-xs font-bold truncate max-w-70 sm:max-w-100">
                                {storeSettings.store_name || 'POSMart'} · {storeSettings.store_address || 'Alamat toko belum diatur'}
                            </p>
                        </div>
                    </button>
                    <Link to="/#katalog-produk" className="text-[11px] font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0">
                        Belanja Sekarang
                    </Link>
                </div>
            </div>

            {/* ===== CAROUSEL PROMO ===== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
                <div className="relative rounded-3xl overflow-hidden shadow-lg">
                    <div
                        className={`relative block bg-linear-to-br ${activeBanner?.color || 'from-emerald-700 via-emerald-600 to-teal-700'} text-white px-6 sm:px-10 py-8 sm:py-10 lg:py-12 min-h-[22rem] sm:min-h-[26rem] overflow-hidden`}
                    >
                        {/* Dekorasi background */}
                        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                        <div className="absolute -left-10 -bottom-28 w-72 h-72 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                            {/* Teks Kiri */}
                            <div className="lg:col-span-7 space-y-4">
                                {bannerIsProduct ? (
                                    <span className="inline-flex items-center gap-1 bg-amber-400 text-emerald-950 text-[11px] font-black px-3 py-1 rounded-full">
                                        <Percent className="w-3.5 h-3.5" /> HEMAT {activeBanner.promo}% · Promo Terbatas
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 bg-white/20 text-[11px] font-black px-3 py-1 rounded-full">
                                        <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> POSMart
                                    </span>
                                )}

                                {bannerIsProduct ? (
                                    <Link to={`/product/${activeBanner.id}`} className="block">
                                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight line-clamp-2 hover:underline transition-all">
                                            {activeBanner.name}
                                        </h1>
                                    </Link>
                                ) : (
                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                                        {activeBanner.name}
                                    </h1>
                                )}

                                {bannerIsProduct ? (
                                    <p className="text-emerald-100/90 text-base sm:text-lg font-bold">
                                        {formatIDR(promoPrice)}
                                        <span className="font-normal line-through text-emerald-200/70 ml-2">{formatIDR(activeBanner.price)}</span>
                                    </p>
                                ) : (
                                    <p className="text-emerald-100/90 text-sm sm:text-base max-w-xl leading-relaxed">{activeBanner.subtitle}</p>
                                )}

                                {/* CTA yang jelas ala hero lama */}
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <a
                                        href="#katalog-produk"
                                        className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-amber-400/20 hover:scale-[1.02] transition-all"
                                    >
                                        Belanja Sekarang
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                    <button
                                        onClick={() => setOnlyPromo(true)}
                                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm px-5 py-3 rounded-xl backdrop-blur-md transition-all cursor-pointer"
                                    >
                                        <Percent className="w-4 h-4 text-amber-300" />
                                        Lihat Promo Hari Ini
                                    </button>
                                </div>
                            </div>

                            {/* Showcase Visual Kanan */}
                            <div className="lg:col-span-5 relative flex justify-center items-center py-4">
                                <div className="relative w-full max-w-xs sm:max-w-sm bg-linear-to-tr from-white/15 to-white/5 border border-white/20 rounded-3xl p-5 backdrop-blur-lg shadow-2xl">
                                    <Link to={bannerIsProduct ? `/product/${activeBanner.id}` : '#katalog-produk'} className="block relative">
                                        <img
                                            src={activeBanner.image || BANNER_IMG_FALLBACK}
                                            alt={activeBanner.name}
                                            onError={(e) => { e.target.onerror = null; e.target.src = BANNER_IMG_FALLBACK; }}
                                            className="w-full aspect-square object-cover rounded-2xl shadow-xl ring-4 ring-white/30"
                                        />
                                    </Link>

                                    {/* Floating Trust Badge 1: Pengiriman */}
                                    <div className="absolute -bottom-3 left-2 bg-white text-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2 animate-bounce">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                            <Truck className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[11px] font-bold text-slate-900">Garansi 30 Menit</div>
                                            <div className="text-[10px] text-slate-500">Pasti sampai tujuan</div>
                                        </div>
                                    </div>

                                    {/* Floating Trust Badge 2: Kualitas */}
                                    <div className="absolute -top-3 right-2 bg-white text-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[11px] font-bold text-slate-900">100% Produk Fresh</div>
                                            <div className="text-[10px] text-slate-500">Dicek setiap pagi</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* arrows */}
                    <button
                        onClick={() => goBanner(bannerIndex - 1)}
                        aria-label="Banner sebelumnya"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => goBanner(bannerIndex + 1)}
                        aria-label="Banner berikutnya"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center cursor-pointer"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {banners.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => goBanner(idx)}
                                aria-label={`Banner ${idx + 1}`}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${bannerIndex === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/60'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== ICON KATEGORI ===== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
                {loadingCategories ? (
                    <div className="flex justify-center py-6"><div className="w-6 h-6 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
                        <div className="grid grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-3">
                            {categories.filter(c => c !== 'All').map((cat) => {
                                const meta = categoryLookup(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => handleCategoryChange(cat)}
                                        className="flex flex-col items-center gap-2 px-1 py-2 group cursor-pointer"
                                    >
                                        <span className={`w-20 h-20 rounded-2xl ${meta.color} flex items-center justify-center text-3xl ring-1 ring-inset ring-black/5 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-md group-hover:ring-emerald-200`}>
                                            {meta.icon}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight group-hover:text-emerald-700 transition-colors">
                                            {cat}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {categories.length === 1 && (
                            <p className="text-xs text-slate-400 text-center py-3">Belum ada kategori terdaftar.</p>
                        )}
                    </div>
                )}
            </section>

            {/* ===== PALING LARIS ===== */}
            {!popularLoading && popularProducts.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-9">
                    {sectionHeading(<TrendingUp className="w-5 h-5" />, 'Paling Laris', '/#katalog-produk')}
                    {productScroller(popularProducts, false)}
                </section>
            )}

            {/* ===== BARU ===== */}
            {newestProducts.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-9">
                    {sectionHeading(<PackageSearch className="w-5 h-5" />, 'Produk Baru', '/#katalog-produk')}
                    {productScroller(newestProducts, false)}
                </section>
            )}

            {/* ===== PROMO HARI INI ===== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-9">
                <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-3xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="bg-linear-to-br from-amber-500 to-orange-500 text-white p-2.5 rounded-xl shadow-lg shadow-amber-500/30">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Kejar Diskon Hari Ini</h3>
                                <p className="text-xs font-medium text-amber-700">Produk pilihan, jangan sampai kehabisan</p>
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-200 shadow-sm">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="font-mono text-sm font-black text-amber-700 tabular-nums">
                                {countdown.h}:{countdown.m}:{countdown.s}
                            </span>
                        </div>
                    </div>

                    {promoProducts.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-6">Belum ada produk promo saat ini, silakan cek kembali.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {promoProducts.slice(0, 8).map((product) => (
                                <ProductCard key={product.id} product={product} storeSettings={storeSettings} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ===== PAKET HEMAT (BUNDLE) ===== */}
            {bundles.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-9">
                    {sectionHeading(<Package className="w-5 h-5" />, 'Paket Hemat', '/#katalog-produk')}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bundles.slice(0, 6).map((b) => (
                            <article key={b.bundle_id} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <img
                                        src={b.items?.[0]?.image || 'https://placehold.co/100x100?text=Paket'}
                                        alt={b.name}
                                        className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border border-slate-100"
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=Paket'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black text-slate-900 leading-tight">{b.name}</h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                            {b.items.map(i => `${i.qty}x ${i.name}`).join(' + ')}
                                        </p>
                                        <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[9px] font-black">
                                            HEMAT {b.save_percent}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-mono line-through">Rp {Number(b.list_total).toLocaleString('id-ID')}</p>
                                        <p className="text-base font-black text-emerald-700">Rp {Number(b.bundle_price).toLocaleString('id-ID')}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAddToCart({
                                            id: 900000 + b.bundle_id,
                                            bundle_id: b.bundle_id,
                                            name: b.name,
                                            price: b.bundle_price,
                                            image: b.items?.[0]?.image || '',
                                            category: 'Bundle',
                                        })}
                                        className="gap-1.5 inline-flex items-center bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <SearchCheck className="w-4 h-4" /> Masukkan
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* ===== SEMUA PRODUK ===== */}
            <main id="katalog-produk" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
                {/*Filter*/}
                <aside className="md:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-20">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4 text-slate-900">
                            <Search className="w-4 h-4 text-emerald-600" />
                            <h3 className="font-bold text-sm tracking-tight">Filter Belanja</h3>
                        </div>

                        {/* kategori */}
                        <div className="mb-5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Kategori</label>
                            {loadingCategories ? (
                                <div className="text-xs text-slate-400 text-center py-3">Memuat kategori...</div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => handleCategoryChange(category)}
                                            className={`text-left text-sm px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${currentCategory === category
                                                ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-600'
                                                : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {category === 'All' ? 'Semua Produk' : category}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* range harga */}
                        <div className="mb-5">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Harga maksimum
                                </label>
                                <span className="text-xs font-mono font-bold text-emerald-700">
                                    Rp {effectiveMaxPrice.toLocaleString('id-ID')}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={MIN_PRICE_LIMIT}
                                max={currentMaxLimit || MIN_PRICE_LIMIT + STEP_VALUE}
                                step={STEP_VALUE}
                                value={effectiveMaxPrice}
                                onChange={(e) => setUserMaxPrice(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                                <span>Rp {MIN_PRICE_LIMIT.toLocaleString('id-ID')}</span>
                                <span>Rp {(currentMaxLimit || MIN_PRICE_LIMIT + STEP_VALUE).toLocaleString('id-ID')}</span>
                            </div>
                            {userMaxPrice !== null && (
                                <button
                                    onClick={() => setUserMaxPrice(null)}
                                    className="text-xs text-emerald-700 hover:underline mt-2 flex items-center gap-1 cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" /> Reset harga
                                </button>
                            )}
                        </div>

                        {/* checkbox promo */}
                        <div className="pt-3 border-t border-slate-100">
                            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={onlyPromo}
                                    onChange={handlePromoToggle}
                                    className="w-4 h-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                />
                                <span>Hanya Produk Promo</span>
                            </label>
                        </div>
                    </div>
                </aside>

                {/*List Grid View*/}
                <div className="md:col-span-3">
                    {/* Hasil pencarian banner */}
                    {currentSearch && (
                        <div className="flex items-center justify-between gap-3 mb-4 bg-white border border-emerald-100 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <SearchCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                <p className="text-sm font-bold text-slate-800 truncate">
                                    Hasil untuk "<span className="text-emerald-700">{currentSearch}</span>"
                                    <span className="ml-2 text-xs font-semibold text-slate-400">{pagination.total_data} produk</span>
                                </p>
                            </div>
                            <button onClick={clearTerm} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-full cursor-pointer transition-colors">
                                <X className="w-3.5 h-3.5" /> Hapus
                            </button>
                        </div>
                    )}

                    {/* Quick Category Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full border transition-all cursor-pointer ${currentCategory === cat
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                                    }`}
                            >
                                {cat === 'All' ? 'Semua Produk' : cat}
                            </button>
                        ))}
                    </div>

                    {/*Sorting Harga*/}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-slate-500">{filteredProduct.length} produk ditemukan</p>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer"
                        >
                            <option value="none">Urutkan</option>
                            <option value="asc">Harga Terendah</option>
                            <option value="desc">Harga Tertinggi</option>
                        </select>
                    </div>

                    {/*List Of Product*/}
                    {filteredProduct.length === 0 ? (
                        <div className="text-center py-16">
                            <PackageSearch className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-600 font-bold text-sm">
                                {currentSearch ? `Tidak ada hasil untuk "${currentSearch}"` : 'Tidak ada produk yang cocok dengan filter.'}
                            </p>
                            {currentSearch ? (
                                <>
                                    <p className="text-xs text-slate-400 mt-1 mb-4">Coba kata kunci lain atau telusuri berikut:</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {hotKeywords.map((k) => (
                                            <button
                                                key={k}
                                                onClick={() => setTerm(k)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors cursor-pointer"
                                            >
                                                <History className="w-3 h-3 text-slate-400" /> {k}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            {filteredProduct.map((singleProduct) => (
                                <ProductCard key={singleProduct.id} product={singleProduct} storeSettings={storeSettings} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/*PAGINATION SECTION*/}
            <Pagination
                currentPage={currentPage}
                totalPage={pagination.total_page}
                totalData={pagination.total_data}
                currentCount={products?.length}
                onPageChange={handlePageChange}
            />

            {/*CHECKOUT MODAL*/}
            <CartModal />
        </div>
    )
}