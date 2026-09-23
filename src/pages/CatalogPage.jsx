//File: pages/CatalogPage.jsx

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import CartModal from "../components/CartModal";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import {
    Percent,
    RotateCcw,
    Sparkle,
    SlidersHorizontal,
    ArrowRight,
    Zap,
    Leaf,
    ShieldCheck,
    Gift,
    Clock,
    Flame,
} from "lucide-react";
import { useProduct } from "../hooks/useProduct";
import api from "../utils/api";

const STEP_VALUE = 500;

export default function CatalogPage() {

    const { products, loading, error, pagination, fetchProducts } = useProduct();
    const [categories, setCategories] = useState(['All']);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [storeSettings, setStoreSettings] = useState({});

    const [onlyPromo, setOnlyPromo] = useState(false);
    const [sortBy, setSortBy] = useState('none');
    const [userMaxPrice, setUserMaxPrice] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const currentPage = parseInt(searchParams.get('page')) || 1;
    const currentSearch = searchParams.get('search') || '';
    const currentCategory = searchParams.get('category') || "All";

    // Countdown timer flash sale (sampai akhir hari)
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

    // Fetch categories dari backend
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await api.get('/get.product.php?categories=1');
                if (response.data && response.data.status === 'success') {
                    setCategories(['All', ...response.data.data]);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                setCategories(['All', 'Food', 'Beverage', 'Personal Care']); // Fallback
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
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

        if (sortBy === 'asc') {
            result.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'desc') {
            result.sort((a, b) => b.price - a.price);
        }

        return result;
    }, [products, currentCategory, effectiveMaxPrice, onlyPromo, sortBy]);

    const promoProducts = useMemo(() => {
        return products ? products.filter(product => product.is_promo) : [];
    }, [products]);

    // Fetch settings toko (nomor WA untuk tombol "Pesan via WA")
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/public/settings.php');
                if (response.data && response.data.status === 'success') {
                    setStoreSettings(response.data.data || {});
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        fetchProducts({
            page: currentPage,
            search: currentSearch,
            category: currentCategory
        });
    }, [currentPage, currentSearch, currentCategory, fetchProducts]);

    const handleCategoryChange = useCallback((category) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', '1');
        if (category === 'All') {
            newParams.delete('category');
        } else {
            newParams.set('category', category);
        }
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

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <div className="w-8 h-8 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-500 tracking-wide animate-pulse">
                    Menghubungkan ke database posmart....
                </p>
            </div>
        )
    }

    // error screen
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3 px-4 text-center">
                <span className="text-4xl">⚠️</span>
                <h3 className="font-bold text-slate-500 text-lg">Gagal memuat katalog</h3>
                <p className="text-sm text-slate-600">{error}</p>
                <button
                    onClick={() => fetchProducts({ page: currentPage, search: currentSearch, category: currentCategory })}
                    className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                    Coba lagi
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            <Header />

            {/* ================= HERO BANNER MODERN ================= */}
            <section className="relative overflow-hidden bg-linear-to-br from-emerald-700 via-emerald-600 to-teal-700 text-white py-14 px-4 sm:px-6 lg:px-8">
                {/* Dekorasi Background Bulatan Halus */}
                <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute right-1/4 -bottom-20 w-80 h-80 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                    {/* Teks Kiri */}
                    <div className="lg:col-span-7 space-y-5">
                        <div className="inline-flex items-center gap-2 bg-emerald-800/60 border border-emerald-400/30 text-emerald-100 text-xs font-semibold px-3.5 py-1.5 rounded-full backdrop-blur-md">
                            <Sparkle className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                            <span>🌿 Kebutuhan Dapur & Sembako Fresh</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                            Belanja Sembako Segar, <br />
                            <span className="text-amber-300">Hemat & Cepat Sampai</span>
                        </h1>

                        <p className="text-emerald-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
                            Penuhi kebutuhan harian keluarga dengan harga grosir langsung dari toko terdekat.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <a
                                href="#katalog-produk"
                                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-amber-400/20 hover:scale-[1.02] transition-all cursor-pointer"
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
                    <div className="lg:col-span-5 relative flex justify-center items-center">
                        <div className="relative w-full max-w-sm sm:max-w-md aspect-square bg-linear-to-tr from-white/15 to-white/5 border border-white/20 rounded-3xl p-6 backdrop-blur-lg shadow-2xl flex flex-col items-center justify-center text-center overflow-visible">
                            {/* Gambar Segar / Produk */}
                            <div className="w-48 h-48 sm:w-56 sm:h-56 relative flex items-center justify-center">
                                <img
                                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
                                    alt="Sayuran dan sembako segar"
                                    className="w-full h-full object-cover rounded-2xl shadow-xl ring-4 ring-white/30"
                                />
                            </div>

                            {/* Floating Badge 1: Pengiriman Cepat */}
                            <div className="absolute -left-2 sm:-left-4 bottom-8 bg-white text-slate-800 px-3.5 py-2 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2.5 animate-bounce">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[11px] font-bold text-slate-900">Garansi 30 Menit</div>
                                    <div className="text-[10px] text-slate-500">Pasti sampai tujuan</div>
                                </div>
                            </div>

                            {/* Floating Badge 2: Kualitas */}
                            <div className="absolute -right-2 sm:-right-3 top-6 bg-white text-slate-800 px-3.5 py-2 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
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
            </section>

            {/* ================= VALUE PROPOSITION BAR ================= */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Delivery Kilat</h4>
                            <p className="text-[11px] text-slate-500">Pengiriman cepat maks. 30-60 menit</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Leaf className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Produk Segar</h4>
                            <p className="text-[11px] text-slate-500">100% segar & higienis</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <RotateCcw className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Return Mudah</h4>
                            <p className="text-[11px] text-slate-500">Garansi retur 1x24 jam</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Gift className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Member Untung</h4>
                            <p className="text-[11px] text-slate-500">Kumpulkan koin & promo</p>
                        </div>
                    </div>
                </div>
            </section>

            {/*FLASH SALE SECTION*/}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="bg-linear-to-br from-amber-500 to-orange-500 text-white p-2 rounded-xl shadow-lg shadow-amber-500/30">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Kejar Diskon Hari Ini</h3>
                                <p className="text-xs font-medium text-amber-700">Produk pilihan, jangan sampai kehabisan</p>
                            </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="inline-flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-200 shadow-sm">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-bold text-slate-700">Berakhir dalam</span>
                            <span className="font-mono text-sm font-black text-amber-700 tabular-nums">
                                {countdown.h}:{countdown.m}:{countdown.s}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {promoProducts.map((product) => (
                            <div key={product.id} className="relative">
                                <div className="absolute top-2 right-2 z-10 bg-linear-to-br from-amber-500 to-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">
                                    PROMO HEMAT
                                </div>
                                <ProductCard product={product} storeSettings={storeSettings} />

                                {/* Progress Stok */}
                                <div className="mt-2 bg-white rounded-xl border border-amber-100 px-3 py-2 shadow-sm">
                                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mb-1">
                                        <span>Stok tersisa</span>
                                        <span className={product.stock <= 5 ? 'text-red-600' : 'text-amber-700'}>
                                            {product.stock} pcs
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-linear-to-r from-amber-400 to-red-500"
                                            style={{ width: `${Math.min(100, Math.max(8, (product.stock / 20) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {promoProducts.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-6">
                            Belum ada produk promo saat ini, silakan cek kembali.
                        </p>
                    )}
                </div>
            </section>

            {/*MAIN CATALOG*/}
            <main id="katalog-produk" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
                {/*Filter*/}
                <aside className="md:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-20">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4 text-slate-900">
                            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
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
                        <div className="text-center text-sm text-slate-400 py-16">Tidak ada produk yang cocok dengan filter.</div>
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