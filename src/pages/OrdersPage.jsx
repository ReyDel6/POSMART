// File: src/pages/OrdersPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Download, Package, RefreshCcw, ShoppingBag } from 'lucide-react';
import api from '../utils/api';
import { generateInvoicePdf } from '../utils/pdfGenerator';

const STATUS_TABS = [
    { key: '', label: 'Semua' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'paid', label: 'Lunas' },
    { key: 'processing', label: 'Diproses' },
    { key: 'completed', label: 'Selesai' },
    { key: 'cancelled', label: 'Dibatalkan' },
    { key: 'expired', label: 'Kedaluwarsa' },
];

function statusStyle(status, paymentStatus) {
    const st = status === 'cancelled' || ['expire', 'cancel', 'deny'].includes(paymentStatus) ? 'danger'
        : status === 'paid' ? 'paid'
        : status === 'processing' ? 'processing'
        : status === 'completed' ? 'completed'
        : 'pending';
    const map = {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        paid: 'bg-sky-100 text-sky-700 border-sky-200',
        processing: 'bg-blue-100 text-blue-700 border-blue-200',
        completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        danger: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return map[st];
}

function statusLabel(status, paymentStatus) {
    const paidFailed = ['expire', 'cancel', 'deny'].includes(paymentStatus);
    if (status === 'cancelled' || paidFailed) {
        return paymentStatus === 'expire' ? 'Kedaluwarsa'
            : paymentStatus === 'deny' ? 'Ditolak'
            : 'Dibatalkan';
    }
    return status === 'paid' ? 'Lunas' : status === 'processing' ? 'Diproses' : status === 'completed' ? 'Selesai' : 'Menunggu';
}

export default function OrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [storeName, setStoreName] = useState('POSMart');

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        api.get('/public/settings.php')
            .then(res => {
                if (res.data?.status === 'success' && res.data.data?.store_name) {
                    setStoreName(res.data.data.store_name);
                }
            })
            .catch(() => {});
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/orders.php?status=${filter}`);
            if (response.data?.status === 'success') {
                setOrders(response.data.data);
            } else {
                setError(response.data?.message || 'Gagal memuat pesanan.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat memuat pesanan.');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const formatIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v) || 0);

    const handleDownloadInvoice = async (order) => {
        setDownloadingId(order.id);
        try {
            const subtotal = order.items.reduce((acc, i) => acc + Number(i.total), 0);
            const summary = {
                order_id: order.id,
                customer_id: null,
                customer_name: order.customer_name,
                phone: order.phone,
                address: order.address,
                courier: order.courier,
                subtotal,
                shipping_fee: order.shipping_fee ?? Math.max(0, Number(order.total_price) - subtotal - (Number(order.points_discount) || 0)),
                total_price: Number(order.total_price),
                items: order.items.map(i => ({ name: i.name, qty: i.qty, price: Number(i.price), total: Number(i.total) })),
            };
            const doc = await generateInvoicePdf(summary, storeName);
            doc.save(`invoice_order_${order.id}.pdf`);
        } catch (e) {
            console.error('Gagal membuat PDF:', e);
            alert('Gagal membuat invoice PDF. Coba lagi.');
        } finally {
            setDownloadingId(null);
        }
    };

    const getPaymentLabel = useMemo(() => (order) => {
        if (order.payment_mode === 'cash' || order.payment_method === 'cash') return 'Tunai';
        if (order.payment_method && order.payment_method !== 'cash') return order.payment_method.toUpperCase();
        if (order.status === 'paid') return 'Lunas';
        return 'Online';
    }, []);

    return (
        <div className="min-h-screen bg-cream font-sans text-ink">
            <header className="bg-white border-b-2 border-ink sticky top-0 z-30 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-lime rounded-xl text-ink transition-colors cursor-pointer" aria-label="Kembali">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-black tracking-tight text-ink">Pesanan Saya</h1>
                    </div>
                    <button onClick={fetchOrders} title="Refresh" className="p-2 hover:bg-lime rounded-xl text-ink cursor-pointer">
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key || 'all'}
                            onClick={() => setFilter(tab.key)}
                            className={`shrink-0 text-xs font-black px-4 py-2 rounded-full border-2 border-ink transition-all cursor-pointer ${filter === tab.key
                                ? 'bg-ink text-cream shadow-[2px_2px_0_#161616]'
                                : 'bg-white text-slate-600 hover:bg-lime'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-28 gap-3 text-slate-500">
                        <div className="w-8 h-8 border-2 border-ink border-t-lime rounded-full animate-spin" />
                        <p className="text-sm font-bold">Memuat pesanan...</p>
                    </div>
                ) : error ? (
                    <div className="bg-rose-50 border-2 border-ink text-rose-700 p-6 rounded-2xl text-center shadow-[4px_4px_0_#161616]">
                        <p className="font-bold text-sm">⚠️ {error}</p>
                        <button onClick={fetchOrders} className="mt-3 px-4 py-2 bg-ink hover:bg-slate-900 text-cream text-xs font-black rounded-lg border-2 border-ink cursor-pointer">
                            Coba Lagi
                        </button>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white border-2 border-ink rounded-2xl py-20 text-center space-y-3 shadow-[5px_5px_0_#161616]">
                        <ShoppingBag className="w-12 h-12 text-ink mx-auto opacity-20" />
                        <p className="text-sm font-black text-ink">Belum ada pesanan</p>
                        <p className="text-xs text-slate-500">Ayo mulai belanja kebutuhan harian Anda.</p>
                        <button onClick={() => navigate('/')} className="mt-2 px-5 py-2.5 bg-ink hover:bg-slate-900 text-cream text-xs font-black rounded-xl border-2 border-ink shadow-[2px_2px_0_#161616] cursor-pointer">
                            Mulai Belanja
                        </button>
                    </div>
                ) : (
                    orders.map(order => {
                        const expanded = expandedId === order.id;
                        return (
                            <div key={order.id} className="bg-white border-2 border-ink rounded-2xl shadow-[4px_4px_0_#161616] overflow-hidden">
                                <button
                                    onClick={() => setExpandedId(expanded ? null : order.id)}
                                    className="w-full text-left p-5 hover:bg-lime/20 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black text-ink">Order <span className="font-mono">#{order.id}</span></p>
                                            <p className="text-xs text-slate-500 mt-0.5">{new Date(order.created_at).toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${statusStyle(order.status, order.payment_status)}`}>
                                                {statusLabel(order.status, order.payment_status)}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-ink transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Package className="w-4 h-4 text-ink" />
                                            {order.items_count} item · {getPaymentLabel(order)}
                                            {order.payment_mode === 'cash' && <span className="text-ink font-black">Tunai</span>}
                                        </div>
                                        <p className="text-base font-black text-ink">{formatIDR(order.total_price)}</p>
                                    </div>
                                </button>

                                {expanded && (
                                    <div className="px-5 pb-5 border-t-2 border-ink pt-4 space-y-3">
                                        <div className="rounded-xl bg-[#EFEFE6] border-2 border-ink p-3 space-y-1.5 text-xs">
                                            <p className="text-slate-500">Nama: <span className="font-semibold text-slate-800">{order.customer_name}</span></p>
                                            <p className="text-slate-500">Telepon: <span className="font-semibold text-slate-800">{order.phone}</span></p>
                                            <p className="text-slate-500">Alamat: <span className="font-semibold text-slate-800">{order.address}</span></p>
                                            <p className="text-slate-500">Pengiriman: <span className="font-semibold text-slate-800 capitalize">{order.courier}</span></p>
                                            {Number(order.points_discount) > 0 && (
                                                <p className="text-amber-600 font-semibold">Poin dipakai: {order.points_used.toLocaleString('id-ID')} poin (- Rp {Number(order.points_discount).toLocaleString('id-ID')})</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    {item.image && (
                                                        <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-[#EFEFE6] border border-ink" onError={(e) => { e.target.style.display = 'none'; }} />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-ink truncate">{item.name}</p>
                                                        <p className="text-xs text-slate-500">{item.qty} x {formatIDR(item.price)}</p>
                                                    </div>
                                                    <span className="text-sm font-black text-ink">{formatIDR(item.total)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => handleDownloadInvoice(order)}
                                            disabled={downloadingId === order.id}
                                            className="w-full flex items-center justify-center gap-2 bg-ink hover:bg-slate-900 disabled:opacity-60 text-cream text-xs font-black py-3 rounded-xl border-2 border-ink shadow-[2px_2px_0_#161616] transition-colors cursor-pointer"
                                        >
                                            <Download className="w-4 h-4" />
                                            {downloadingId === order.id ? 'Membuat PDF...' : 'Download Invoice PDF'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
}