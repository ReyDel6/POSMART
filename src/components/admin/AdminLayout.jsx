import { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Store, LayoutDashboard, Package, ShoppingBag, LogOut, UserCheck, Menu, X, Tags, BarChart3, Users, Settings, ChevronDown, ChevronRight, Truck, Percent, Radar } from 'lucide-react';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // State untuk mengontrol dropdown submenu mana yang terbuka
    const [openDropdowns, setOpenDropdowns] = useState({
        'manajemen-produk': true,
        'transaksi-laporan': true,
        'pengaturan-sistem': false,
    });

    let user = { name: 'Admin POSMart', email: 'admin@posmart.com', role: 'admin' };
    try {
        const stored = localStorage.getItem('user_profile');
        if (stored) user = JSON.parse(stored);
    } catch {
        // ignore
    }

    const isOwner = user.role === 'owner';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_profile');
        navigate('/login');
    };

    const toggleDropdown = (id) => {
        setOpenDropdowns(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const routeTitles = {
        '/admin': { title: 'Ringkasan Dashboard', parent: 'Utama' },
        '/admin/products': { title: 'Kelola Produk', parent: 'Manajemen Produk' },
        '/admin/categories': { title: 'Kategori Produk', parent: 'Manajemen Produk' },
        '/admin/orders': { title: 'Daftar Transaksi', parent: 'Transaksi & Laporan' },
        '/admin/reports': { title: 'Laporan Penjualan', parent: 'Transaksi & Laporan' },
        '/admin/users': { title: 'Kelola Staf & Kasir', parent: 'Pengaturan & Staf' },
        '/admin/settings': { title: 'Pengaturan Toko', parent: 'Pengaturan & Staf' },
        '/admin/shipping-zones': { title: 'Zona Pengiriman', parent: 'Manajemen Produk' },
        '/admin/promos': { title: 'Kelola Promo', parent: 'Manajemen Produk' },
        '/admin/analytics': { title: 'Analitik & Restock', parent: 'Transaksi & Laporan' },
    };

    const currentRouteInfo = routeTitles[location.pathname] || { title: 'Admin Panel', parent: 'POS' };

    const navItems = [
        {
            type: 'link',
            path: '/admin',
            label: 'Ringkasan Dashboard',
            icon: LayoutDashboard
        },
        ...(!isOwner ? [{
            type: 'dropdown',
            id: 'manajemen-produk',
            label: 'Manajemen Produk',
            icon: Package,
            children: [
                { path: '/admin/products', label: 'Kelola Produk', icon: Package },
                { path: '/admin/categories', label: 'Kategori Produk', icon: Tags },
                { path: '/admin/promos', label: 'Promo & Paket', icon: Percent },
                { path: '/admin/shipping-zones', label: 'Zona Pengiriman', icon: Truck },
            ]
        }] : []),
        {
            type: 'dropdown',
            id: 'transaksi-laporan',
            label: 'Transaksi & Laporan',
            icon: ShoppingBag,
            children: [
                { path: '/admin/orders', label: 'Daftar Transaksi', icon: ShoppingBag },
                { path: '/admin/reports', label: 'Laporan Penjualan', icon: BarChart3 },
                { path: '/admin/analytics', label: 'Analitik & Restock', icon: Radar },
            ]
        },
        ...(!isOwner ? [{
            type: 'dropdown',
            id: 'pengaturan-sistem',
            label: 'Pengaturan & Staf',
            icon: Settings,
            children: [
                { path: '/admin/users', label: 'Kelola Kasir & User', icon: Users },
                { path: '/admin/settings', label: 'Pengaturan Toko', icon: Settings },
            ]
        }] : []),
    ];

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* SIDEBAR */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-slate-900 text-slate-300 flex flex-col shadow-xl transition-all duration-300 overflow-hidden`}>
                {/* Brand / Logo */}
                <div className="p-6 border-b-2 border-ink flex items-center gap-3 w-64">
                    <div className="p-2.5 bg-lime rounded-xl text-ink shadow-[3px_3px_0_#CBF169]">
                        <Store className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-black text-white text-lg tracking-tight">
                            POS <span className="text-lime">Mart</span>
                        </h1>
                        <span className="text-xs text-cream/50 font-medium">{isOwner ? 'Panel Owner' : 'Panel Admin'}</span>
                    </div>
                </div>

                {/* Navigation Links with Dropdowns */}
                <nav className="flex-1 p-4 space-y-2 w-64 overflow-y-auto">
                    {navItems.map((item) => {
                        if (item.type === 'link') {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                        isActive
                                            ? 'bg-lime text-ink border-2 border-lime shadow-[3px_3px_0_#CBF169]'
                                            : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Icon className="w-4.5 h-4.5" />
                                    {item.label}
                                </Link>
                            );
                        }

                        if (item.type === 'dropdown') {
                            const ParentIcon = item.icon;
                            const isOpen = !!openDropdowns[item.id];
                            const isChildActive = item.children.some(child => location.pathname === child.path);

                            return (
                                <div key={item.id} className="space-y-1">
                                    <button
                                        onClick={() => toggleDropdown(item.id)}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                                            isChildActive 
                                                ? 'bg-slate-800 text-white font-bold border-l-4 border-emerald-500 pl-2.5' 
                                                : 'hover:bg-slate-800/80 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <ParentIcon className="w-4.5 h-4.5 text-slate-400" />
                                            <span>{item.label}</span>
                                        </div>
                                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    </button>

                                    {/* Dropdown Items */}
                                    {isOpen && (
                                        <div className="pl-6 space-y-1 pt-1">
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                const isActive = location.pathname === child.path;
                                                return (
                                                    <Link
                                                        key={child.path}
                                                        to={child.path}
                                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                                            isActive
                                                                ? 'bg-lime text-ink'
                                                                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        <ChildIcon className="w-3.5 h-3.5" />
                                                        {child.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return null;
                    })}
                </nav>

                {/* Return to POS Catalog / App */}
                <div className="p-4 border-t border-slate-800 w-64">
                    <Link
                        to="/"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                    >
                        <Store className="w-4 h-4" />
                        Buka Halaman Kasir
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* TOPBAR */}
                <header className="bg-white h-20 border-b-2 border-ink px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-lime rounded-lg text-ink cursor-pointer"
                        >
                            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                        <div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                                <span>Admin</span>
                                <span>/</span>
                                <span>{currentRouteInfo.parent}</span>
                                <span>/</span>
                                <span className="text-slate-600 font-black">{currentRouteInfo.title}</span>
                            </div>
                            <h2 className="text-xl font-black text-ink tracking-tight">{currentRouteInfo.title}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 pl-4 border-l-2 border-ink">
                            <div className="w-10 h-10 rounded-full bg-lime text-ink border-2 border-ink font-black flex items-center justify-center text-sm">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="text-left">
                                <h4 className="text-sm font-black text-ink">{user.name}</h4>
                                <span className="text-xs text-coral font-black capitalize flex items-center gap-1">
                                    <UserCheck className="w-3 h-3" /> {user.role || 'Admin'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            title="Keluar Akun"
                            className="p-2.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* PAGE DYNAMIC OUTLET */}
                <main className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
