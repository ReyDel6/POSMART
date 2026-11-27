// File: src/pages/admin/AdminOrdersPage.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import { Search, RefreshCcw, AlertTriangle, Eye, X, ChevronLeft, ChevronRight, Printer, MessageCircle, Wallet } from 'lucide-react';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, revenue: 0, completed: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [savingId, setSavingId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cashReceived, setCashReceived] = useState('');

    const fetchOrders = useCallback(async () => {
        try {
            const response = await api.get('/admin/orders.php', { params: { search, status: statusFilter, date_from: dateFrom, date_to: dateTo, page, per_page: 20 } });
            if (response.data && response.data.status === 'success') {
                setOrders(response.data.data || []);
                setMeta(response.data.meta || { current_page: page, last_page: 1, total: 0, revenue: 0, completed: 0, pending: 0 });
            }
        } catch (err) {
            console.error("Gagal mengambil daftar transaksi:", err);
            setError(err.response?.data?.message || "Terjadi kesalahan saat memuat daftar transaksi.");
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, dateFrom, dateTo, page]);

    useEffect(() => {
        let ignore = false;
        fetchOrders().finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, [fetchOrders]);

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
    };

    const updateOrderStatus = async (orderId, status, payment = {}) => {
        setSavingId(orderId);
        setError('');
        try {
            const response = await api.put('/admin/orders.php', { id: orderId, status, ...payment });
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

    const openPayment = (order) => {
        setPaymentOrder(order);
        setPaymentMethod('cash');
        setCashReceived(String(order.total_price || ''));
    };

    const submitPayment = async (event) => {
        event.preventDefault();
        const total = Number(paymentOrder.total_price) || 0;
        const received = Number(cashReceived) || 0;
        if (paymentMethod === 'cash' && received < total) {
            setError('Uang diterima belum mencukupi total transaksi.');
            return;
        }
        await updateOrderStatus(paymentOrder.id, 'paid', { payment_method: paymentMethod, cash_received: received });
        setPaymentOrder(null);
    };

    const openDetail = async (orderId) => {
        setDetailLoading(true);
        try {
            const response = await api.get('/admin/orders/detail.php', { params: { id: orderId } });
            if (response.data?.status === 'success') setDetail(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat detail pesanan.');
        } finally {
            setDetailLoading(false);
        }
    };

    const formatDate = (value) => value ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-';
    const totalRevenue = meta.revenue || 0;
    const completedCount = meta.completed || 0;
    const pendingCount = meta.pending || 0;

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
        <>
        <div className="space-y-6">
            <div className="bg-slate-950 text-white rounded-3xl p-7 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div><p className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em]">Operational desk</p><h2 className="text-3xl font-black mt-2">Transaksi</h2><p className="text-slate-200 text-sm mt-2">Pantau alur pesanan dan status pembayaran toko.</p></div>
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
                <div><h3 className="text-lg font-black text-slate-900">Daftar order</h3><p className="text-xs text-slate-500 mt-1">{meta.total} transaksi ditemukan</p></div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <label className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Cari ID atau pelanggan" className="pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>
                    <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="processing">Diproses</option><option value="paid">Lunas</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select>
                    <input type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-xl text-sm" title="Tanggal mulai" />
                    <input type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-xl text-sm" title="Tanggal akhir" />
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
                            <th className="py-3 px-6 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="py-8 text-center text-slate-400 font-medium">
                                    Belum ada transaksi terekam.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3.5 px-6"><button onClick={() => openDetail(order.id)} className="font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer">#{order.id}</button></td>
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
                                    <td className="py-3.5 px-6 text-xs text-slate-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                                    <td className="py-3.5 px-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openDetail(order.id)} className="p-2 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700" title="Lihat detail"><Eye className="w-4 h-4" /></button>
                                            {order.payment_status !== 'paid' && ['pending', 'processing'].includes(order.status) && (
                                                <button onClick={() => openPayment(order)} disabled={savingId === order.id} className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-600 hover:text-white text-[10px] font-bold disabled:opacity-50">Terima Pembayaran</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between mt-5 text-sm">
                <span className="text-slate-500">Halaman {meta.current_page} dari {meta.last_page}</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> Sebelumnya</button>
                    <button disabled={page >= meta.last_page} onClick={() => setPage(current => current + 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 disabled:opacity-40">Selanjutnya <ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
        </div>
        {detail && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex justify-between items-start mb-5"><div><p className="text-xs font-bold text-slate-400">STRUK PESANAN</p><h3 className="text-2xl font-black text-slate-900">#{detail.id}</h3></div><button onClick={() => setDetail(null)} className="p-2 rounded-lg bg-slate-100"><X className="w-5 h-5" /></button></div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-5"><div><p className="text-slate-400">Pelanggan</p><p className="font-bold">{detail.customer_name}</p>{detail.phone && <a href={`https://wa.me/${String(detail.phone).replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline text-xs mt-1"><MessageCircle className="w-3 h-3" /> WhatsApp</a>}</div><div><p className="text-slate-400">Tanggal</p><p className="font-bold">{formatDate(detail.created_at)}</p></div></div>
                    <div className="border-y border-slate-200 divide-y divide-slate-100">
                        {detailLoading ? <p className="py-6 text-center text-slate-400">Memuat detail...</p> : detail.items.map((item, index) => <div key={`${item.name}-${index}`} className="py-3 flex justify-between gap-3 text-sm"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.qty} x {formatRupiah(item.price)}</p></div><p className="font-bold">{formatRupiah(item.total)}</p></div>)}
                    </div>
                    <div className="space-y-2 mt-4 text-sm"><div className="flex justify-between"><span>Ongkos kirim</span><span>{formatRupiah(detail.shipping_fee)}</span></div><div className="flex justify-between text-lg font-black"><span>Total</span><span className="text-emerald-600">{formatRupiah(detail.total_price)}</span></div></div>
                    <button onClick={() => window.print()} className="mt-5 w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white font-bold"><Printer className="w-4 h-4" /> Cetak Struk</button>
                </div>
            </div>
        )}
        {paymentOrder && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center">
                <form onSubmit={submitPayment} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                    <div className="flex items-start justify-between mb-5"><div><p className="text-xs font-bold text-slate-400">PEMBAYARAN ORDER #{paymentOrder.id}</p><h3 className="text-2xl font-black text-slate-900">{formatRupiah(paymentOrder.total_price)}</h3></div><button type="button" onClick={() => setPaymentOrder(null)}><X className="w-5 h-5" /></button></div>
                    <div className="grid grid-cols-3 gap-2 mb-4">{[['cash', 'Tunai'], ['qris', 'QRIS'], ['debit', 'Debit']].map(([value, label]) => <button type="button" key={value} onClick={() => setPaymentMethod(value)} className={`py-2 rounded-xl border text-sm font-bold ${paymentMethod === value ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}><Wallet className="w-4 h-4 inline mr-1" />{label}</button>)}</div>
                    {paymentMethod === 'cash' && <><label className="block text-sm font-bold text-slate-700">Uang diterima<input type="number" min={paymentOrder.total_price} value={cashReceived} onChange={event => setCashReceived(event.target.value)} className="mt-2 w-full px-3 py-2.5 border border-slate-300 rounded-xl text-lg font-bold" required /></label><p className="mt-3 text-center text-sm text-slate-500">Kembalian <strong className="block text-2xl text-emerald-600">{formatRupiah(Math.max(0, Number(cashReceived) - Number(paymentOrder.total_price)))}</strong></p></>}
                    <button className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black disabled:opacity-50" disabled={savingId === paymentOrder.id}>{savingId === paymentOrder.id ? 'Menyimpan...' : 'Konfirmasi Pembayaran'}</button>
                </form>
            </div>
        )}
        </>
    );
}
