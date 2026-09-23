// File: src/pages/admin/AdminDashboardPage.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { DollarSign, ShoppingBag, Package, AlertTriangle, RefreshCcw, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        total_revenue: 0,
        total_orders: 0,
        total_products: 0,
        total_low_stock: 0
    });
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [dailySales, setDailySales] = useState([]);
    const [categorySalesDaily, setCategorySalesDaily] = useState([]);
    const [categorySalesTotal, setCategorySalesTotal] = useState([]);
    const [selectedPieDate, setSelectedPieDate] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDashboardData = useCallback(async () => {
        try {
            const response = await api.get('/admin/stats.php');
            if (response.data && response.data.status === 'success') {
                const data = response.data.data;
                setStats(data.summary || {});
                setLowStockProducts(data.low_stock_products || []);
                setRecentOrders(data.recent_orders || []);
                setDailySales(data.daily_sales || []);
                setCategorySalesDaily(data.category_sales_daily || []);
                setCategorySalesTotal(data.category_sales_total || []);

                if (data.daily_sales && data.daily_sales.length > 0) {
                    const latestDate = data.daily_sales[data.daily_sales.length - 1].date;
                    setSelectedPieDate(latestDate);
                }
            }
        } catch (err) {
            console.error("Gagal mengambil data statistik admin:", err);
            setError(err.response?.data?.message || "Terjadi kesalahan saat memuat data dashboard.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let ignore = false;
        api.get('/admin/stats.php')
            .then(response => {
                if (ignore) return;
                if (response.data && response.data.status === 'success') {
                    const data = response.data.data;
                    setStats(data.summary || {});
                    setLowStockProducts(data.low_stock_products || []);
                    setRecentOrders(data.recent_orders || []);
                    setDailySales(data.daily_sales || []);
                    setCategorySalesDaily(data.category_sales_daily || []);
                    setCategorySalesTotal(data.category_sales_total || []);
                    if (data.daily_sales && data.daily_sales.length > 0) {
                        setSelectedPieDate(data.daily_sales[data.daily_sales.length - 1].date);
                    }
                }
            })
            .catch(err => {
                if (ignore) return;
                console.error("Gagal mengambil data statistik admin:", err);
                setError(err.response?.data?.message || "Terjadi kesalahan saat memuat data dashboard.");
            })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, []);

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
    };

    const formatShortRupiah = (number) => {
        if (number >= 1000000) {
            return `Rp ${(number / 1000000).toFixed(1)}JT`;
        } else if (number >= 1000) {
            return `Rp ${(number / 1000).toFixed(0)}K`;
        }
        return `Rp ${number}`;
    };

    const formatDateLabel = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    // Filter dates for Pie Chart dropdown
    const availableDates = Array.from(
        new Set([
            ...dailySales.map(d => d.date),
            ...categorySalesDaily.map(c => c.date)
        ])
    ).filter(Boolean).sort((a, b) => new Date(b) - new Date(a));

    const currentPieData = selectedPieDate === 'all'
        ? categorySalesTotal
        : categorySalesDaily.filter(item => item.date === selectedPieDate);

    // Chart Data Configs
    const lineChartData = {
        labels: dailySales.map(item => formatDateLabel(item.date)),
        datasets: [
            {
                label: 'Total Penjualan (Rp)',
                data: dailySales.map(item => Number(item.total_sales)),
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.12)',
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#059669',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            }
        ]
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        return ` Penjualan: ${formatRupiah(context.parsed.y)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 11, family: 'Inter, sans-serif' } }
            },
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: {
                    font: { size: 11, family: 'Inter, sans-serif' },
                    callback: (value) => formatShortRupiah(value)
                }
            }
        }
    };

    const pieChartData = {
        labels: currentPieData.map(item => item.category),
        datasets: [
            {
                label: 'Penjualan',
                data: currentPieData.map(item => Number(item.total_sales)),
                backgroundColor: [
                    '#059669', '#3b82f6', '#f59e0b', '#8b5cf6',
                    '#ec4899', '#06b6d4', '#84cc16', '#f97316'
                ],
                borderWidth: 2,
                borderColor: '#ffffff',
            }
        ]
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    font: { size: 11, family: 'Inter, sans-serif' }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const val = context.parsed || 0;
                        return ` ${label}: ${formatRupiah(val)}`;
                    }
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-slate-600 font-medium text-sm">Memuat ringkasan statistik...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex flex-col items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-rose-600" />
                <p className="font-bold text-center">{error}</p>
                <button
                    onClick={() => { setLoading(true); setError(''); fetchDashboardData(); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    // Hitung tren nyata dari data harian (hari terakhir vs hari sebelumnya)
    const salesSeries = dailySales.map(d => Number(d.total_sales));
    const orderSeries = dailySales.map(d => Number(d.total_orders));
    const pctChange = (series) => {
        if (series.length < 2) return null;
        const last = series[series.length - 1];
        const prev = series[series.length - 2];
        if (!prev) return null;
        return ((last - prev) / prev) * 100;
    };
    const revenueTrend = pctChange(salesSeries);
    const orderTrend = pctChange(orderSeries);
    const trendBadge = (pct) => {
        if (pct === null) return <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Belum ada tren</span>;
        const positive = pct >= 0;
        return (
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${positive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                <TrendingUp className={`w-3.5 h-3.5 ${positive ? '' : 'rotate-180'}`} />
                {positive ? '+' : ''}{pct.toFixed(1)}%
            </span>
        );
    };

    return (
        <div className="space-y-8">
            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Revenue */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        {trendBadge(revenueTrend)}
                    </div>
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Penjualan</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{formatRupiah(stats.total_revenue)}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">Performa hari ini</p>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        {trendBadge(orderTrend)}
                    </div>
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transaksi</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total_orders} <span className="text-xs font-medium text-slate-500">Order</span></h3>
                        <p className="text-[11px] text-slate-400 mt-1">Aktivitas hari ini</p>
                    </div>
                </div>

                {/* Total Products */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Package className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Katalog</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Produk</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total_products} <span className="text-xs font-medium text-slate-500">Item</span></h3>
                        <p className="text-[11px] text-slate-400 mt-1">Produk aktif dijual</p>
                    </div>
                </div>

                {/* Low Stock Alert Count */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">Perlu dicek</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stok Menipis</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total_low_stock} <span className="text-xs font-medium text-slate-500">Produk</span></h3>
                        <p className="text-[11px] text-slate-400 mt-1">Segera restock</p>
                    </div>
                </div>
            </div>

            {/* LOWER SECTION: CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LINE CHART: TOTAL SALES PER DAY */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-base">Grafik Total Penjualan Harian</h3>
                                <p className="text-xs text-slate-400">Tren omzet penjualan toko per hari</p>
                            </div>
                        </div>
                        <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                            {dailySales.length} Hari Aktif
                        </span>
                    </div>

                    <div className="h-72 w-full pt-2">
                        {dailySales.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                Belum ada data penjualan harian.
                            </div>
                        ) : (
                            <Line data={lineChartData} options={lineChartOptions} />
                        )}
                    </div>
                </div>

                {/* PIE CHART: SALES PER CATEGORY PER DAY */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <PieChartIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Penjualan / Kategori</h3>
                                    <p className="text-xs text-slate-400">Proporsi produk terjual</p>
                                </div>
                            </div>
                        </div>

                        {/* Date Filter for Pie Chart */}
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Tanggal:</label>
                            <select
                                value={selectedPieDate}
                                onChange={(e) => setSelectedPieDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                                <option value="all">Semua Waktu (Total)</option>
                                {availableDates.map((dateStr) => (
                                    <option key={dateStr} value={dateStr}>
                                        {formatDateLabel(dateStr)} ({dateStr})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="h-56 w-full flex items-center justify-center relative">
                        {currentPieData.length === 0 ? (
                            <div className="text-center text-slate-400 text-sm">
                                Tidak ada data kategori untuk tanggal ini.
                            </div>
                        ) : (
                            <Pie data={pieChartData} options={pieChartOptions} />
                        )}
                    </div>
                </div>
            </div>

            {/* LOWER SECTION: TABLES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LOW STOCK TABLE */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-slate-800 text-base">Peringatan Stok Produk (&le; 5)</h3>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                            {lowStockProducts.length} Produk
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                                    <th className="py-3 px-6">Nama Produk</th>
                                    <th className="py-3 px-4">Kategori</th>
                                    <th className="py-3 px-4 text-center">Stok</th>
                                    <th className="py-3 px-6 text-right">Harga</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {lowStockProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">
                                            Aman! Tidak ada produk dengan stok menipis.
                                        </td>
                                    </tr>
                                ) : (
                                    lowStockProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-6 font-semibold text-slate-800">{p.name}</td>
                                            <td className="py-3.5 px-4 text-slate-500">{p.category}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-lg">
                                                    {p.stock}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 text-right font-bold text-slate-700">{formatRupiah(p.price)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RECENT ORDERS TABLE */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-blue-500" />
                            <h3 className="font-bold text-slate-800 text-base">Transaksi Terbaru</h3>
                        </div>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                            5 Terakhir
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                                    <th className="py-3 px-6">Pelanggan</th>
                                    <th className="py-3 px-4">Kasir</th>
                                    <th className="py-3 px-4">Tanggal</th>
                                    <th className="py-3 px-6 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-slate-400 font-medium">
                                            Belum ada transaksi terekam.
                                        </td>
                                    </tr>
                                ) : (
                                    recentOrders.map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-6 font-semibold text-slate-800">
                                                {o.customer_name}
                                                <span className="block text-xs font-normal text-slate-400">ID: #{o.id}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 font-medium">{o.cashier_name}</td>
                                            <td className="py-3.5 px-4 text-xs text-slate-500">{o.created_at}</td>
                                            <td className="py-3.5 px-6 text-right font-bold text-emerald-600">{formatRupiah(o.total_price)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
