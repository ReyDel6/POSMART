//File: src/components/Header.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, LogIn, LogOut, Menu, Search, ShoppingCart, User } from "lucide-react";
import { useCartContext } from "../context/CartContext";


export default function Header() {

    const { totalCartItemsCount, setIsOpenCart } = useCartContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const [shopDropdown, setShowDropDown] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');

    // DEBOUNCE EFFECT (NUNGGU USER BERENTI)
    useEffect(() => {
        const currentSearchUrl = searchParams.get('search') || '';
        if (localSearch === currentSearchUrl) return;

        const currentCategory = searchParams.get('category') || 'All';

        const delayDebounceFn = setTimeout(() => {
            // create new object
            const newParams = new URLSearchParams(searchParams);

            // Reset pagenation to page 1
            newParams.set('page', '1');
            newParams.set('category', currentCategory);

            if (localSearch.trim() !== '') {
                newParams.set('search', localSearch.trim());
            } else {
                newParams.delete('search');
            }

            setSearchParams(newParams);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // searchParams sengaja tidak dimasukkan ke deps: objeknya baru setiap render,
        // memasukkannya akan memicu loop debounce tak terbatas. Nilai yang dibutuhkan
        // (currentSearchUrl, currentCategory) sudah ditangkap sebelum timeout.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localSearch, setSearchParams]);


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
        // reset local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user_profile');

        // rubah state internal
        setIsLoggedIn(false);
        setShowDropDown(false);

        // redirect to home page
        window.location.href = '/';
    };

    return (
        <header className="bg-white border-b border-slate-100 sticky top-0 z-50 p-4 shadow-xs">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="text-xl font-black tracking-tight text-emerald-600 cursor-pointer" onClick={() => window.location.href = '/'}>
                    POS<span className="text-green-600">MART</span>
                </h1>

                {/* SEARCH BAR*/}
                <div className="hidden sm:flex flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="cari kebutuhan harian anda..."
                        className="w-full bg-slate-50 border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>
                {/*action & authentication interface*/}
                <div className="flex items-center gap-4 relative">
                    {/* keranjang belanja */}
                    <button onClick={() => setIsOpenCart(true)}
                        aria-label="Buka keranjang belanja"
                        className="relative p-2 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                        <ShoppingCart className="w-6 h-6" />
                        {totalCartItemsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-mono text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                {totalCartItemsCount}
                            </span>
                        )}
                    </button>

                    {/* login auth */}
                    {!isLoggedIn ? (
                        //belum login redirect ke login page
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            <LogIn className="w-4 h-4" />
                            LOG IN
                        </button>
                    ) : (
                        // sudah LOGIN, tampilkan profil avatar
                        <div className="relative">
                            <button
                                onClick={() => setShowDropDown(!shopDropdown)}
                                aria-label="Buka menu akun"
                                className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-hidden"
                            >
                                <img
                                    src={userProfile.avatar}
                                    alt={userProfile.name}
                                    className="w-8 h-8 rounded-full object-cover border-slate-200"
                                />
                                <span className="hidden md:inline-block text-sm font-semibold text-slate-700 max-w-30 truncate">
                                    {userProfile.name}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${shopDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown profile */}
                            {shopDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowDropDown(false)}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white border-slate-200 rounded-xl shadow-lg py-1 z-40 ">
                                        <div className="px-4 py-2 border-b border-slate-100 md:hidden">
                                            <p className="text-sm font-bold text-slate-500 truncate">{userProfile.name}</p>
                                        </div>
                                        {/* profil page */}
                                        <button
                                            onClick={() => {
                                                setShowDropDown(false);
                                                window.location.href = '/profile';
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                            <User className="w-4 h-4 text-slate-400" />
                                            lihat profil
                                        </button>

                                        {/* pesanan saya */}
                                        <button
                                            onClick={() => {
                                                setShowDropDown(false);
                                                window.location.href = '/orders';
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                            <ShoppingCart className="w-4 h-4 text-slate-400" />
                                            pesanan saya
                                        </button>

                                        {/* logout */}
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                            <LogOut className="w-4 h-4 text-slate-400" />
                                            LOGOUT
                                        </button>
                                    </div>

                                </>
                            )}
                        </div>
                    )}

                    {/* mobile menu */}
                    <button onClick={() => setMobileSearchOpen(prev => !prev)} aria-label="Buka pencarian" className="sm:hidden p-2 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"><Menu /></button>
                </div>
            </div>

            {/* search mobile (dropdown menu) */}
            {mobileSearchOpen && (
                <div className="sm:hidden max-w-7xl mx-auto mt-3 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="cari kebutuhan harian anda..."
                        className="w-full bg-slate-50 border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>
            )}
        </header>
    )
}