// File: src/pages/admin/AdminOrdersPage.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import { Search, RefreshCcw, AlertTriangle } from 'lucide-react';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [savingId, setSavingId] = useState(null);

    const fetchOrders = useCallback(async () => {
        try {
            const response = await api.get('/admin/orders.php');
            if (response.data && response.data.status === 'success') {
                setOrders(response.data.data);
            }
        } catch (err) {
            console.error("Gagal mengambil daftar transaksi:", err);
            setError(err.response?.data?.message || "Terjadi kesalahan saat memuat daftar transaksi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let ignore = false;
        api.get('/admin/orders.php')
            .then(response => {
                if (ignore) return;
                if (response.data && response.data.status === 'success') {
                    setOrders(response.data.data);
                }
            })
            .catch(err => {
                if (ignore) return;
                console.error("Gagal mengambil daftar transaksi:", err);
                setError(err.response?.data?.message || "Terjadi kesalahan saat memuat daftar transaksi.");
            })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, []);

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
    };

    const updateOrderStatus = async (orderId, status) => {
        setSavingId(orderId);
        setError('');
        try {
            const response = await api.put('/admin/orders.php', { id: orderId, status });
            if (response.data && response.data.status === 'success') {
                const patch = response.data.order || { status };
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o));
            } else {
                alert(response.data?.message || 'Gagal mengubah status transaksi.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal mengubah status transaksi.');
        } finally {
            setSavingId(null);
        }
    };

    const visibleOrders = useMemo(() => orders.filter(order => {
        const query = search.toLowerCase();
        const matchesSearch = !query || String(order.id).includes(query) || order.customer_name?.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [orders, search, statusFilter]);

    const totalRevenue = orders.reduce((total, order) => total + Number(order.total_price || 0), 0);
    const completedCount = orders.filter(order => order.status === 'completed').length;
    const pendingCount = orders.filter(order => order.status === 'pending').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-slate-600 font-medium text-sm">Memuat daftar transaksi...</p>
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
                    onClick={() => { setLoading(true); setError(''); fetchOrders(); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-950 text-white rounded-3xl p-7 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div><p className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em]">Operational desk</p><h2 className="text-3xl font-black mt-2">Transaksi</h2><p className="text-slate-300 text-sm mt-2">Pantau alur pesanan dan status pembayaran toko.</p></div>
                    <button onClick={() => { setLoading(true); setError(''); fetchOrders(); }} title="Refresh transaksi" className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20"><RefreshCcw className="w-4 h-4" /></button>
                </div>
                <div className="absolute -right-12 -bottom-24 w-64 h-64 rounded-full border-[35px] border-emerald-600/20" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs uppercase tracking-wider font-black text-slate-400">Total transaksi</p><p className="text-2xl font-black text-slate-900 mt-2">{orders.length}</p><p className="text-xs text-slate-500 mt-1">{formatRupiah(totalRevenue)} nilai order</p></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs uppercase tracking-wider font-black text-slate-400">Selesai</p><p className="text-2xl font-black text-emerald-600 mt-2">{completedCount}</p><p className="text-xs text-slate-500 mt-1">Transaksi berhasil diproses</p></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs uppercase tracking-wider font-black text-slate-400">Menunggu</p><p className="text-2xl font-black text-amber-600 mt-2">{pendingCount}</p><p className="text-xs text-slate-500 mt-1">Perlu pemeriksaan</p></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div><h3 className="text-lg font-black text-slate-900">Daftar order</h3><p className="text-xs text-slate-500 mt-1">{visibleOrders.length} transaksi ditampilkan</p></div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <label className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari ID atau pelanggan" className="pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>
                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="processing">Diproses</option><option value="paid">Lunas</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="py-3 px-6">ID Order</th>
                            <th className="py-3 px-4">Pelanggan</th>
                            <th className="py-3 px-4">Kasir</th>
                            <th className="py-3 px-4">Total Harga</th>
                            <th className="py-3 px-4">Pembayaran</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-6">Tanggal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {visibleOrders.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">
                                    Belum ada transaksi terekam.
                                </td>
                            </tr>
                        ) : (
                            visibleOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3.5 px-6 font-semibold text-slate-800">#{order.id}</td>
                                    <td className="py-3.5 px-4 text-slate-600 font-medium">{order.customer_name}</td>
                                    <td className="py-3.5 px-4 text-slate-600 font-medium">{order.cashier_name}</td>
                                    <td className="py-3.5 px-4 font-bold text-emerald-600">{formatRupiah(order.total_price)}</td>
                                    <td className="py-3.5 px-4">
                                        {(() => {
                                            const ps = order.payment_status || 'pending';
                                            let cls = 'bg-slate-100 text-slate-600 border-slate-200';
                                            let label = 'Tunai / WA';
                                            if (ps === 'paid') { cls = 'bg-emerald-100 text-emerald-700 border-emerald-200'; label = 'Lunas'; }
                                            if (ps === 'pending') { cls = 'bg-amber-100 text-amber-700 border-amber-200'; label = 'Menunggu'; }
                                            if (['expire', 'cancel', 'deny'].includes(ps)) { cls = 'bg-rose-100 text-rose-700 border-rose-200'; label = ps === 'cancel' ? 'Batal' : ps === 'expire' ? 'Kedaluwarsa' : 'Ditolak'; }
                                            return (
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${ps === 'paid' ? 'bg-emerald-600' : ps === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                        {label}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${order.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                            {order.payment_mode === 'cash' ? 'Tunai/walk-in' : 'Online'}
                                                        </span>
                                                        {order.payment_method && <span className="text-[10px] font-semibold text-slate-400 uppercase">{order.payment_method}</span>}
                                                        {ps !== 'paid' && !['expire', 'cancel', 'deny'].includes(ps) && ['pending', 'processing'].includes(order.status) && (
                                                            <button
                                                                onClick={() => updateOrderStatus(order.id, 'paid')}
                                                                disabled={savingId === order.id}
                                                                title="Umumkan pembayaran transaksi ini lunas (manual)"
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                                                            >
                                                                {savingId === order.id ? '...' : 'Umumkan Lunas'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                            disabled={savingId === order.id}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer focus:outline-none disabled:opacity-60 transition-colors ${
                                                order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                order.status === 'paid' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                                                order.status === 'processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                order.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                'bg-rose-100 text-rose-700 border-rose-200'
                                            }`}
                                        >
                                            <option value="pending">Menunggu</option>
                                            <option value="processing">Diproses</option>
                                            <option value="paid">Lunas</option>
                                            <option value="completed">Selesai</option>
                                            <option value="cancelled">Dibatalkan</option>
                                        </select>
                                        {savingId === order.id && <span className="ml-2 text-[10px] text-slate-400">menyimpan...</span>}
                                    </td>
                                    <td className="py-3.5 px-6 text-xs text-slate-500">{order.created_at}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        </div>
    );
}
