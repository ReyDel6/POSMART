//File: src/components/Header.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, LogIn, LogOut, Menu, Search, ShoppingCart, User, X, Clock, TrendingUp, ArrowRight, Check, Trash2, ShoppingBag } from "lucide-react";
import { useCartContext } from "../context/CartContext";
import api from "../utils/api";

const RECENT_KEY = 'recent_searches';

const readRecent = () => {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch (e) {
        return [];
    }
};

const saveRecent = (term) => {
    const q = String(term || '').trim();
    if (!q) return;
    let list = readRecent().filter(x => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    list = list.slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
};

const formatIDR = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

export default function Header() {

    const { totalCartItemsCount, setIsOpenCart } = useCartContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const [shopDropdown, setShowDropDown] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');

    // ===== Autocomplete / saran pencarian =====
    const [suggestions, setSuggestions] = useState([]);
    const [sugLoading, setSugLoading] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState(readRecent());
    const sugTimer = useRef(null);

    const syncParams = (term) => {
        const currentSearchUrl = searchParams.get('search') || '';
        if (term.trim() === currentSearchUrl.trim()) return;

        const currentCategory = searchParams.get('category') || 'All';
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', '1');
        newParams.set('category', currentCategory);
        if (term.trim() !== '') {
            newParams.set('search', term.trim());
        } else {
            newParams.delete('search');
        }
        setSearchParams(newParams);
    };

    // DEBOUNCE EFFECT (NUNGGU USER BERENTI) — sinkron parameter URL
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => syncParams(localSearch), 500);
        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localSearch]);

    // DEBOUNCE FETCH SARAN
    useEffect(() => {
        clearTimeout(sugTimer.current);
        if (localSearch.trim() === '') {
            setSuggestions([]);
            setSugLoading(false);
            return;
        }
        setSugLoading(true);
        sugTimer.current = setTimeout(() => {
            api.get(`/get.search_suggestions.php?q=${encodeURIComponent(localSearch.trim())}&limit=6`)
                .then(res => {
                    if (res.data?.status === 'success') setSuggestions(res.data.data || []);
                    else setSuggestions([]);
                })
                .catch(() => setSuggestions([]))
                .finally(() => setSugLoading(false));
        }, 220);
        return () => clearTimeout(sugTimer.current);
    }, [localSearch]);

    const commitSearch = (term) => {
        const q = String(term || localSearch || '').trim();
        if (!q) return;
        saveRecent(q);
        setRecentSearches(readRecent());
        setSearchFocused(false);
        setMobileSearchOpen(false);
        syncParams(q);
    };

    const removeRecent = (term) => {
        const next = readRecent().filter(x => x.toLowerCase() !== term.toLowerCase());
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        setRecentSearches(next);
    };

    // sinkronisasi dengan jwt
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem('token') !== null;
    });

    const userProfile = (() => {
        const savedProfile = localStorage.getItem('user_profile');
        if (savedProfile) {
            try {
                const user = JSON.parse(savedProfile);
                return {
                    name: user.name,
                    avatar: user.avatar || "/avatars/images.png"
                }
            } catch (e) {
                console.error("gagal parsing data user profile :", e);
            }
        }
        return { name: "guest", avatar: "" }
    })();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_profile');
        setIsLoggedIn(false);
        setShowDropDown(false);
        window.location.href = '/';
    };

    const searchBoxProps = {
        value: localSearch,
        onChange: setLocalSearch,
        suggestions,
        sugLoading,
        searchFocused,
        setSearchFocused,
        recentSearches,
        onCommit: commitSearch,
        removeRecent,
        onClear: () => { setLocalSearch(''); setSuggestions([]); },
    };

    return (
        <header className="bg-cream border-b-2 border-ink sticky top-0 z-50 px-4 py-3 shadow-sm" style={{ position: 'sticky' }}>
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="shrink-0" style={{ minWidth: 150 }}>
                    <Link to="/" className="flex items-center gap-2.5" aria-label="POSMart beranda">
                        <span className="w-10 h-10 rounded-xl border-2 border-ink bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[3px_3px_0_#161616] transition-transform hover:-translate-y-0.5">
                            <ShoppingBag className="w-5 h-5" />
                        </span>
                        <span className="flex flex-col leading-none">
                            <span className="text-lg font-black tracking-tight text-ink leading-none display">
                                POS<span className="text-coral">Mart</span>
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 tracking-[0.18em] uppercase mt-1">
                                Minimarket Digital
                            </span>
                        </span>
                    </Link>
                </h1>

                {/* navpills */}
                <nav className="hidden lg:flex items-center gap-2">
                    <a href="/" className="text-[13px] font-bold px-4 py-2 rounded-full border-2 border-ink bg-lime">Beranda</a>
                    <a href="/#katalog-produk" className="text-[13px] font-bold px-4 py-2 rounded-full border-2 border-ink hover:bg-white transition-colors">Kategori</a>
                </nav>

                {/* SEARCH BAR */}
                <div className="hidden md:flex flex-1 max-w-md relative">
                    <SearchBox {...searchBoxProps} mobile={false} />
                </div>
                {/*action & authentication interface*/}
                <div className="flex items-center gap-3 relative">
                    {/* keranjang belanja */}
                    <button onClick={() => setIsOpenCart(true)}
                        aria-label="Buka keranjang belanja"
                        className="relative w-10 h-10 rounded-full border-2 border-ink bg-white flex items-center justify-center text-ink shadow-[3px_3px_0_#161616] hover:bg-ink hover:text-lime transition-colors cursor-pointer"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        {totalCartItemsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-coral text-white font-mono text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                {totalCartItemsCount}
                            </span>
                        )}
                    </button>

                    {/* login auth */}
                    {!isLoggedIn ? (
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="bg-ink hover:bg-slate-900 text-cream font-bold text-xs px-5 py-2.5 rounded-lg border-2 border-ink shadow-[3px_3px_0_#161616] active:shadow-none active:translate-x-0.5 flex items-center gap-2 transition-all cursor-pointer neo-press"
                        >
                            <LogIn className="w-4 h-4" />
                            MASUK
                        </button>
                    ) : (
                        <div className="relative">
                            <button
                                onClick={() => setShowDropDown(!shopDropdown)}
                                aria-label="Buka menu akun"
                                className="flex items-center gap-2 p-1.5 pr-3 rounded-full border-2 border-ink bg-white shadow-[3px_3px_0_#161616] hover:bg-cream transition-colors cursor-pointer focus:outline-hidden"
                            >
                                <img
                                    src={userProfile.avatar}
                                    alt={userProfile.name}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-ink"
                                />
                                <span className="hidden md:inline-block text-sm font-bold text-ink max-w-30 truncate">
                                    {userProfile.name}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${shopDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {shopDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowDropDown(false)}></div>
                                    <div className="absolute right-0 mt-2 w-52 bg-white border-2 border-ink rounded-xl shadow-lg py-1 z-40">
                                        <div className="px-4 py-2 border-b-2 border-ink md:hidden">
                                            <p className="text-sm font-black text-ink truncate">{userProfile.name}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowDropDown(false);
                                                window.location.href = '/profile';
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-slate-800 hover:bg-lime/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                            <User className="w-4 h-4 text-slate-500" />
                                            lihat profil
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDropDown(false);
                                                window.location.href = '/orders';
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-slate-800 hover:bg-lime/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                            <ShoppingCart className="w-4 h-4 text-slate-500" />
                                            pesanan saya
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2.5 text-slate-800 hover:bg-lime/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                            <LogOut className="w-4 h-4 text-slate-500" />
                                            LOGOUT
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* mobile menu */}
                    <button onClick={() => setMobileSearchOpen(prev => !prev)} aria-label="Buka pencarian" className="sm:hidden w-10 h-10 rounded-full border-2 border-ink bg-white flex items-center justify-center text-ink cursor-pointer"><Menu /></button>
                </div>
            </div>

            {/* search mobile (dropdown menu) */}
            {mobileSearchOpen && (
                <div className="sm:hidden max-w-7xl mx-auto mt-3 relative">
                    <SearchBox {...searchBoxProps} mobile={true} />
                </div>
            )}
        </header>
    )
}

function SearchBox({ value, onChange, suggestions, sugLoading, searchFocused, setSearchFocused, recentSearches, onCommit, removeRecent, onClear, mobile }) {
    const hasValue = value.trim() !== '';
    const open = searchFocused;
    const showRecent = open && !hasValue;
    const showSuggestions = open && hasValue;
    const searchOn = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(value); }
        if (e.key === 'Escape') setSearchFocused(false);
    };

    return (
        <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
                type="text"
                value={value}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={searchOn}
                onChange={(e) => onChange(e.target.value)}
                placeholder="cari kebutuhan harian anda..."
                aria-label="Cari produk"
                className="w-full bg-white border-2 border-ink rounded-full pl-9 pr-9 py-2 text-sm shadow-sm focus:outline-hidden focus:border-ink focus:ring-2 focus:ring-ink/15 focus:bg-white transition-all"
            />
            {hasValue && (
                <button
                    onClick={onClear}
                    aria-label="Hapus pencarian"
                    className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-red-500 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {open && (
                <>
                    <div className={`absolute top-full left-0 right-0 mt-2 bg-white border-2 border-ink rounded-xl shadow-lg overflow-hidden z-50`}>
                        {showRecent && recentSearches.length > 0 && (
                            <div className="p-2">
                                <div className="flex items-center justify-between px-3 py-1.5">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Pencarian Terakhir
                                    </p>
                                </div>
                                {recentSearches.map((term) => (
                                    <div key={term} className="group flex items-center">
                                        <button
                                            onClick={() => onCommit(term)}
                                            className="flex-1 text-left px-3 py-2 text-sm text-slate-800 hover:bg-lime/40 rounded-lg flex items-center gap-2 cursor-pointer"
                                        >
                                            <Search className="w-3.5 h-3.5 text-slate-400" />
                                            {term}
                                        </button>
                                        <button
                                            onClick={() => removeRecent(term)}
                                            aria-label={`Hapus ${term}`}
                                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showSuggestions && (
                            <div className="p-2">
                                <p className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> Saran Terpopuler
                                </p>
                                {sugLoading ? (
                                    <div className="px-3 py-6 flex justify-center">
                                        <div className="w-5 h-5 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : suggestions.length === 0 ? (
                                    <p className="px-3 py-3 text-sm text-slate-400">Tidak ada produk yang cocok.</p>
                                ) : (
                                    suggestions.map((p) => {
                                        const dealLabel = p.deal?.label || (p.is_promo ? `-${p.promo}%` : '');
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => { window.location.href = `/product/${p.id}`; }}
                                                className="w-full text-left px-2 py-2 hover:bg-lime/40 rounded-lg flex items-center gap-3 cursor-pointer"
                                            >
                                                <img
                                                    src={p.image || 'https://placehold.co/100x100?text=No'}
                                                    alt={p.name}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=No'; }}
                                                    className="w-9 h-9 rounded-lg object-cover bg-slate-100 border-2 border-ink"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-ink truncate">{p.name}</p>
                                                    <p className="text-xs text-slate-500">{p.category}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-black text-emerald-700">{formatIDR(p.price)}</p>
                                                    {dealLabel && (
                                                        <p className="text-[10px] font-bold text-coral">{dealLabel}</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {showSuggestions && hasValue && (
                            <button
                                onClick={() => onCommit(value)}
                                className="w-full text-left px-4 py-3 border-t-2 border-ink text-sm font-black text-emerald-800 hover:bg-lime/40 flex items-center justify-between cursor-pointer"
                            >
                                <span className="flex items-center gap-2">
                                    <Search className="w-4 h-4" />
                                    Lihat semua hasil "{value.trim()}"
                                </span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {showRecent && recentSearches.length === 0 && (
                            <div className="px-3 py-6 text-center">
                                <Check className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                                <p className="text-xs text-slate-400">Ketik untuk mencari produk.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}