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

const MARQUEE_ITEMS = ['SEMBAKO', 'BEVERAGE', 'PERSONAL CARE', 'TOOLS', 'SNACK', 'FROZEN FOOD'];

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
            <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-3">
                <div className="w-10 h-10 border-2 border-ink border-t-lime rounded-full animate-spin"></div>
                <p className="text-sm font-black text-ink tracking-wide animate-pulse">
                    Menghubungkan ke database posmart....
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-3 px-4 text-center">
                <span className="text-4xl">⚠️</span>
                <h3 className="font-black text-ink text-lg display">Gagal memuat toko</h3>
                <p className="text-sm text-slate-600">{error}</p>
                <button
                    onClick={() => fetchProducts({ page: currentPage, search: currentSearch, category: currentCategory })}
                    className="mt-2 px-5 py-2.5 bg-ink text-cream text-xs font-black rounded-lg border-2 border-ink shadow-[3px_3px_0_#161616] hover:bg-slate-900 transition-colors cursor-pointer"
                >
                    Coba lagi
                </button>
            </div>
        );
    }

    const sectionHeading = (icon, title, link) => (
        <div className="flex items-center justify-between mb-5 gap-3">
            <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg border-2 border-ink bg-lime text-ink flex items-center justify-center shadow-[3px_3px_0_#161616]">
                    {icon}
                </span>
                <h3 className="display text-xl sm:text-2xl text-ink">{title}</h3>
            </div>
            <Link to={link} className="flex items-center gap-1 text-xs font-black text-ink underline underline-offset-4 hover:text-coral transition-colors">
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
        <div className="min-h-screen bg-cream font-sans antialiased text-ink">
            <Header />

            {/* ===== BAR LOKASI TOKO ===== */}
            <div className="bg-ink text-white sticky top-[65px] z-40 border-y-2 border-ink">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
                    <button onClick={() => window.location.hash = '#katalog-produk'} className="flex items-center gap-2 text-left cursor-pointer hover:opacity-80 transition-opacity">
                        <MapPin className="w-4 h-4 shrink-0 text-coral" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-lime uppercase tracking-wide">Kirim ke</p>
                            <p className="text-xs font-bold truncate max-w-70 sm:max-w-100 text-white">
                                {storeSettings.store_name || 'POSMart'} · {storeSettings.store_address || 'Alamat toko belum diatur'}
                            </p>
                        </div>
                    </button>
                    <Link to="/#katalog-produk" className="text-[11px] font-black bg-lime hover:bg-lime/80 text-ink px-4 py-1.5 rounded-full border-2 border-ink flex items-center gap-1 shrink-0 shadow-[3px_3px_0_#CBF169]">
                        Belanja Sekarang
                    </Link>
                </div>
            </div>

            {/* ===== CAROUSEL PROMO ===== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
                <div className="relative border-2 border-ink rounded-2xl overflow-hidden bg-white shadow-[8px_8px_0_#161616]">
                    <div className="relative px-6 sm:px-10 py-8 sm:py-10 lg:py-12 min-h-[22rem] sm:min-h-[26rem] overflow-hidden">
                        {/* Dekorasi neo */}
                        <div className="absolute -right-14 -top-14 w-56 h-56 rounded-full bg-lime border-2 border-ink rotate-12 opacity-90 pointer-events-none" />
                        <div className="absolute -left-8 -bottom-16 w-48 h-48 rounded-full bg-[#FFD9CC] border-2 border-ink -rotate-6 pointer-events-none" />
                        <div className="absolute right-8 bottom-6 w-4 h-4 rounded-full bg-coral border-2 border-ink pointer-events-none" />

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                            {/* Teks Kiri */}
                            <div className="lg:col-span-7 space-y-4">
                                {bannerIsProduct ? (
                                    <span className="inline-flex items-center gap-1.5 -rotate-1 bg-white border-2 border-ink rounded-full text-ink text-[11px] font-black px-3.5 py-1.5 shadow-[3px_3px_0_#161616]">
                                        <Percent className="w-3.5 h-3.5 text-coral" /> HEMAT {activeBanner.promo}% · Promo Terbatas
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rotate-1 bg-white border-2 border-ink rounded-full text-ink text-[11px] font-black px-3.5 py-1.5 shadow-[3px_3px_0_#161616]">
                                        <Star className="w-3.5 h-3.5 text-coral fill-coral" /> POSMart
                                    </span>
                                )}

                                {(() => {
                                    const words = String(activeBanner.name).split(' ');
                                    const last = words.pop();
                                    const head = words.join(' ');
                                    return bannerIsProduct ? (
                                        <Link to={`/product/${activeBanner.id}`} className="block">
                                            <h1 className="display text-4xl sm:text-5xl text-ink leading-[1.02] line-clamp-2">
                                                {head} <span className="bg-lime px-1.5 box-decoration-clone">{last}</span>
                                            </h1>
                                        </Link>
                                    ) : (
                                        <h1 className="display text-4xl sm:text-5xl text-ink leading-[1.02]">
                                            {head} <span className="bg-lime px-1.5 box-decoration-clone">{last}</span>
                                        </h1>
                                    );
                                })()}

                                {bannerIsProduct ? (
                                    <p className="text-lg font-black text-ink">
                                        <span className="text-coral text-2xl">{formatIDR(promoPrice)}</span>
                                        <span className="font-semibold line-through text-slate-400 ml-3">{formatIDR(activeBanner.price)}</span>
                                    </p>
                                ) : (
                                    <p className="text-sm sm:text-base max-w-xl leading-relaxed text-slate-600 font-medium">{activeBanner.subtitle}</p>
                                )}

                                {/* CTA neo */}
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <a
                                        href="#katalog-produk"
                                        className="inline-flex neo-press items-center gap-2 bg-ink text-cream font-black text-sm px-6 py-3 rounded-lg border-2 border-ink shadow-[4px_4px_0_#161616] transition-all"
                                    >
                                        Belanja Sekarang
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                    <button
                                        onClick={() => setOnlyPromo(true)}
                                        className="inline-flex items-center gap-2 bg-white text-ink font-bold text-sm px-5 py-3 rounded-lg border-2 border-ink shadow-[3px_3px_0_#161616] hover:bg-lime transition-colors cursor-pointer"
                                    >
                                        <Percent className="w-4 h-4 text-coral" />
                                        Lihat Promo Hari Ini
                                    </button>
                                </div>
                            </div>

                            {/* Showcase Visual Kanan */}
                            <div className="lg:col-span-5 relative flex justify-center items-center py-4">
                                <div className="relative w-full max-w-xs sm:max-w-sm">
                                    <div className="border-[3px] border-ink rounded-xl overflow-hidden shadow-[9px_9px_0_#161616] bg-[#EFEFE6]">
                                        <Link to={bannerIsProduct ? `/product/${activeBanner.id}` : '#katalog-produk'} className="block">
                                            <img
                                                src={activeBanner.image || BANNER_IMG_FALLBACK}
                                                alt={activeBanner.name}
                                                onError={(e) => { e.target.onerror = null; e.target.src = BANNER_IMG_FALLBACK; }}
                                                className="w-full aspect-square object-cover"
                                            />
                                        </Link>
                                    </div>

                                    {/* Sticker cor */}
                                    <div className="absolute -top-5 -right-3 w-24 h-24 rounded-full bg-coral border-2 border-ink text-white flex flex-col items-center justify-center text-center rotate-[-8deg] shadow-[3px_3px_0_#161616]">
                                        <span className="text-[13px] font-black leading-tight">30 MENIT<br />SAMPAI</span>
                                    </div>

                                    {/* Price tag */}
                                    <div className="absolute -bottom-4 -left-3 bg-white border-2 border-ink rounded-lg px-4 py-2 shadow-[4px_4px_0_#161616] text-[11px] font-bold text-slate-600">
                                        {bannerIsProduct ? 'Harga sekarang' : 'Mulai dari'}
                                        <b className="block text-base font-black text-ink">{formatIDR(bannerIsProduct ? promoPrice : (activeBanner.price || 8000))}</b>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* arrows */}
                    <button
                        onClick={() => goBanner(bannerIndex - 1)}
                        aria-label="Banner sebelumnya"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border-2 border-ink text-ink flex items-center justify-center shadow-[3px_3px_0_#161616] hover:bg-lime transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => goBanner(bannerIndex + 1)}
                        aria-label="Banner berikutnya"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border-2 border-ink text-ink flex items-center justify-center shadow-[3px_3px_0_#161616] hover:bg-lime transition-colors cursor-pointer"
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
                                className={`h-2 rounded-full transition-all cursor-pointer ${bannerIndex === idx ? 'w-6 bg-ink' : 'w-2 bg-slate-500'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== MARQUEE KATEGORI ===== */}
            <div className="marquee-band mt-6">
                <div className="marquee-track">
                    {MARQUEE_ITEMS.concat(MARQUEE_ITEMS).map((t, i) => (
                        <span key={i} className={i % 2 === 0 ? 'hot' : ''}>{t}</span>
                    ))}
                </div>
            </div>

            {/* ===== FITUR ===== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-9">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        ['01', 'Delivery Kilat', 'Maks. 30–60 menit', <Truck className="w-5 h-5" />],
                        ['02', 'Produk Segar', '100% segar & higienis', <ShieldCheck className="w-5 h-5" />],
                        ['03', 'Return Mudah', 'Garansi retur 1x24 jam', <RotateCcw className="w-5 h-5" />],
                        ['04', 'Member Untung', 'Kumpulkan koin & promo', <TrendingUp className="w-5 h-5" />],
                    ].map(([num, title, desc, icon]) => (
                        <div key={num} className="bg-white border-2 border-ink rounded-xl p-5 shadow-[4px_4px_0_#161616] flex flex-col gap-2 neo-press">
                            <div className="flex items-center justify-between">
                                <span className="display text-2xl text-coral">{num}</span>
                                <span className="w-9 h-9 rounded-lg bg-lime border-2 border-ink text-ink flex items-center justify-center">{icon}</span>
                            </div>
                            <b className="text-[15px] text-ink font-black">{title}</b>
                            <span className="text-xs text-slate-600 font-medium">{desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== ICON KATEGORI ===== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
                {loadingCategories ? (
                    <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-ink border-t-lime rounded-full animate-spin" /></div>
                ) : (
                    <div className="bg-white rounded-2xl border-2 border-ink shadow-[4px_4px_0_#161616] p-4">
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                            {categories.filter(c => c !== 'All').map((cat, ci) => {
                                const meta = categoryLookup(cat);
                                const tileColor = ['bg-lime', 'bg-white', 'bg-[#FFD9CC]', 'bg-[#D9E1FF]', 'bg-[#FFE4D8]'][ci % 5];
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => handleCategoryChange(cat)}
                                        className={`flex flex-col items-stretch justify-between gap-4 px-4 py-4 min-h-[120px] rounded-xl border-2 border-ink ${tileColor} shadow-[4px_4px_0_#161616] transition-transform duration-150 group hover:-translate-y-1 cursor-pointer`}
                                    >
                                        <span className="text-[24px] leading-none">{meta.icon}</span>
                                        <span className="text-[13px] font-black text-ink uppercase text-left leading-tight">
                                            {cat}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {categories.length === 1 && (
                            <p className="text-xs text-slate-500 text-center py-3">Belum ada kategori terdaftar.</p>
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
                <div className="bg-ink border-2 border-ink rounded-xl p-5 sm:p-6 shadow-[6px_6px_0_#161616]">
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="bg-coral text-white p-2.5 rounded-lg border-2 border-ink shadow-[3px_3px_0_#CBF169]">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight display">Kejar Diskon Hari Ini</h3>
                                <p className="text-xs font-bold text-amber-300">Produk pilihan, jangan sampai kehabisan</p>
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-cream text-ink px-3 py-2 rounded-lg border-2 border-ink shadow-[3px_3px_0_#CBF169]">
                            <Clock className="w-4 h-4 text-coral" />
                            <span className="font-mono text-sm font-black tabular-nums text-ink">
                                {countdown.h}:{countdown.m}:{countdown.s}
                            </span>
                        </div>
                    </div>

                    {promoProducts.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">Belum ada produk promo saat ini, silakan cek kembali.</p>
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
                            <article key={b.bundle_id} className="bg-white border-2 border-ink rounded-xl p-4 shadow-[4px_4px_0_#161616] hover:-translate-y-1 transition-transform flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <img
                                        src={b.items?.[0]?.image || 'https://placehold.co/100x100?text=Paket'}
                                        alt={b.name}
                                        className="w-16 h-16 rounded-lg object-cover bg-[#EFEFE6] border-2 border-ink"
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=Paket'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black text-ink leading-tight">{b.name}</h4>
                                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                                            {b.items.map(i => `${i.qty}x ${i.name}`).join(' + ')}
                                        </p>
                                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-lime border-2 border-ink text-ink rounded text-[9px] font-black">
                                            HEMAT {b.save_percent}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-mono line-through">Rp {Number(b.list_total).toLocaleString('id-ID')}</p>
                                        <p className="text-base font-black text-ink">Rp {Number(b.bundle_price).toLocaleString('id-ID')}</p>
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
                                        className="gap-1.5 inline-flex items-center bg-ink hover:bg-slate-900 text-cream text-xs font-black px-4 py-2.5 rounded-lg border-2 border-ink shadow-[3px_3px_0_#161616] transition-colors cursor-pointer"
                                    >
                                        <SearchCheck className="w-4 h-4 text-lime" /> Masukkan
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
                    <div className="bg-white p-5 rounded-xl border-2 border-ink shadow-[4px_4px_0_#161616] sticky top-20">
                        <div className="flex items-center gap-2 pb-3 border-b-2 border-ink mb-4 text-ink">
                            <Search className="w-4 h-4 text-coral" />
                            <h3 className="font-black text-sm tracking-tight">Filter Belanja</h3>
                        </div>

                        {/* kategori */}
                        <div className="mb-5">
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Kategori</label>
                            {loadingCategories ? (
                                <div className="text-xs text-slate-500 text-center py-3">Memuat kategori...</div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => handleCategoryChange(category)}
                                            className={`text-left text-sm px-3 py-2 rounded-lg font-bold transition-colors cursor-pointer ${currentCategory === category
                                                ? 'bg-lime text-ink border-l-4 border-ink shadow-[2px_2px_0_#161616]'
                                                : 'text-slate-700 hover:bg-[#EFEDE3]'
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
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                                    Harga maksimum
                                </label>
                                <span className="text-xs font-mono font-black text-ink">
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
                                className="w-full h-1.5 bg-[#DCD9CE] rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                                <span>Rp {MIN_PRICE_LIMIT.toLocaleString('id-ID')}</span>
                                <span>Rp {(currentMaxLimit || MIN_PRICE_LIMIT + STEP_VALUE).toLocaleString('id-ID')}</span>
                            </div>
                            {userMaxPrice !== null && (
                                <button
                                    onClick={() => setUserMaxPrice(null)}
                                    className="text-xs font-black text-ink underline hover:text-coral mt-2 flex items-center gap-1 cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" /> Reset harga
                                </button>
                            )}
                        </div>

                        {/* checkbox promo */}
                        <div className="pt-3 border-t-2 border-ink">
                            <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={onlyPromo}
                                    onChange={handlePromoToggle}
                                    className="w-4 h-4 rounded-sm border-2 border-ink text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
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
                        <div className="flex items-center justify-between gap-3 mb-4 bg-white border-2 border-ink rounded-xl px-4 py-3 shadow-[3px_3px_0_#161616]">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <SearchCheck className="w-5 h-5 text-coral shrink-0" />
                                <p className="text-sm font-black text-ink truncate">
                                    Hasil untuk "<span className="bg-lime px-1">{currentSearch}</span>"
                                    <span className="ml-2 text-xs font-bold text-slate-500">{pagination.total_data} produk</span>
                                </p>
                            </div>
                            <button onClick={clearTerm} className="shrink-0 inline-flex items-center gap-1 text-xs font-black text-slate-700 hover:text-red-700 bg-[#EFEDE3] hover:bg-red-100 border border-ink px-3 py-1.5 rounded-full cursor-pointer transition-colors">
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
                                className={`shrink-0 text-xs font-black px-4 py-2 rounded-full border-2 border-ink transition-all cursor-pointer ${currentCategory === cat
                                    ? 'bg-ink text-white border-ink shadow-[3px_3px_0_#161616]'
                                    : 'bg-white text-slate-700 border-ink hover:bg-lime/40'
                                    }`}
                            >
                                {cat === 'All' ? 'Semua Produk' : cat}
                            </button>
                        ))}
                    </div>

                    {/*Sorting Harga*/}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-slate-600">{filteredProduct.length} produk ditemukan</p>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm font-black border-2 border-ink rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer shadow-[2px_2px_0_#161616]"
                        >
                            <option value="none">Urutkan</option>
                            <option value="asc">Harga Terendah</option>
                            <option value="desc">Harga Tertinggi</option>
                        </select>
                    </div>

                    {/*List Of Product*/}
                    {filteredProduct.length === 0 ? (
                        <div className="text-center py-16">
                            <PackageSearch className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-700 font-black text-sm">
                                {currentSearch ? `Tidak ada hasil untuk "${currentSearch}"` : 'Tidak ada produk yang cocok dengan filter.'}
                            </p>
                            {currentSearch ? (
                                <>
                                    <p className="text-xs font-bold text-slate-500 mt-1 mb-4">Coba kata kunci lain atau telusuri berikut:</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {hotKeywords.map((k) => (
                                            <button
                                                key={k}
                                                onClick={() => setTerm(k)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-white border-2 border-ink text-slate-700 hover:bg-lime/40 transition-colors cursor-pointer"
                                            >
                                                <History className="w-3 h-3 text-coral" /> {k}
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