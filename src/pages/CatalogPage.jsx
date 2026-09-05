//File: pages/CatalogPage.jsx

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import CartModal from "../components/CartModal";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import { Percent, RotateCcw, Sparkle, Truck, SlidersHorizontal } from "lucide-react";
import { useProduct } from "../hooks/useProduct";
import api from "../utils/api";

const STEP_VALUE = 500;

export default function CatalogPage() {

    const { products, loading, error, pagination, fetchProducts } = useProduct();
    const [categories, setCategories] = useState(['All']);
    const [loadingCategories, setLoadingCategories] = useState(true);

    const [onlyPromo, setOnlyPromo] = useState(false);
    const [sortBy, setSortBy] = useState('none');
    const [userMaxPrice, setUserMaxPrice] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const currentPage = parseInt(searchParams.get('page')) || 1;
    const currentSearch = searchParams.get('search') || '';
    const currentCategory = searchParams.get('category') || "All";

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
                <div className="w-8 h-8 border-red-800 border-t-transparent rounded-full animate-spin"></div>
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
                    className="mt-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                    Coba lagi
                </button>
            </div>
        )
    }



    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            <Header />

            {/*HERO BANNER*/}
            <section className="bg-linear-to-r  from-green-600 to-green-300 text-white py-12 px-4 shadow-inner">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-4 ">
                        <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
                            <Sparkle className="w-4 h-4 text-yellow-400 fill bg-yellow-400" /> Promo Agustus
                        </span>
                        <h2>
                            Belanja Sembako Murah, <br /> Dekat & Nyaman
                        </h2>
                        <p>Penuhi kebutuhan harian rumah tangga anda dengan harga hemat.</p>
                    </div>
                    <div className="relative h-80 flex items-end">
                        <img src="" alt="" className="absolute h-100 object-contain z-10 drop-shadow-lg hidden md:block" />
                        <div className="w-full hidden md:block bg-white/10 border border-white/20 h-70 rounded-2xl backdrop-blur-xs relative me-8">
                            <img src="" alt="" className="w-full h-full object-cover rounded-2xl" />
                            <div className="absolute left-6 -top-4 z-10">
                                <span className="text-xl font-bold bg-yellow-400 text-green-900 px-3 py-1 rounded-md shadow-md">POSMart Fresh</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/*VALUE PROPOSITION BAR*/}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 shadow-xs">
                    <div className="items-center gap-2.5">
                        <Truck className="w-5 h-5 text-red-900 shrink-8" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Delivery Kilat</h4>
                            <p className="text-[10 px] text-slate-400">Antar langsung ke rumah</p>
                        </div>
                    </div>
                    <div className="items-center gap-2.5">
                        <Truck className="w-5 h-5 text-red-600 shrink-8" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Produk segar</h4>
                            <p className="text-[10 px] text-slate-400">jaminan tanggal kadaluarsa aman</p>
                        </div>
                    </div>
                    <div className="items-center gap-2.5">
                        <Truck className="w-5 h-5 text-red-600 shrink-8" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Return mudah</h4>
                            <p className="text-[10 px] text-slate-400">Cukup bawa struk toko</p>
                        </div>
                    </div>
                    <div className="items-center gap-2.5">
                        <Truck className="w-5 h-5 text-red-600 shrink-8" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">member untung</h4>
                            <p className="text-[10 px] text-slate-400">Kumpulkan koinnya</p>
                        </div>
                    </div>
                </div>
            </section>

            {/*FLASH SALE SECTION*/}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <div className="bg-amber-50 border border-e-amber-200 rounded-2xl p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-red-600 text-white p-1.5 rounded-lg animate-bounce">
                                <Percent className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Kejar diskon hari ini</h3>
                                <p className="text-xs text-amber-700">Produk pilihan, jangan sampai kehabisan</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {promoProducts.map((product) => (
                            <div key={product.id} className="relative">
                                <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-xs">PROMO HEMAT</div>
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/*MAIN CATALOG*/}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
                {/*Filter*/}
                <aside className="md:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs sticky top-20">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4 text-slate-900">
                            <SlidersHorizontal className="w-4 h-4 text-red-600" />
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
                                                ? 'bg-red-50 text-red-600'
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
                                <span className="text-xs font-mono font-bold text-red-600">
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
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                                <span>Rp {MIN_PRICE_LIMIT.toLocaleString('id-ID')}</span>
                                <span>Rp {(currentMaxLimit || MIN_PRICE_LIMIT + STEP_VALUE).toLocaleString('id-ID')}</span>
                            </div>
                            {userMaxPrice !== null && (
                                <button
                                    onClick={() => setUserMaxPrice(null)}
                                    className="text-xs text-red-600 hover:underline mt-2 flex items-center gap-1 cursor-pointer"
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
                                    className="w-4 h-4 rounded-sm border-slate-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                                />
                                <span>Hanya Produk Promo</span>
                            </label>
                        </div>
                    </div>
                </aside>

                {/*List Grid View*/}
                <div className="md:col-span-3">
                    {/*Sorting Harga*/}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-slate-500">{filteredProduct.length} produk ditemukan</p>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
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
                                <ProductCard key={singleProduct.id} product={singleProduct} />
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