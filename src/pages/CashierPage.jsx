import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCcw, CheckCircle2, Clock, Truck, Ban, ShoppingBag, LogOut, MessageCircle, ChevronDown, Printer, MapPin, MoreVertical, Monitor } from "lucide-react";
import api from "../utils/api";

const STATUS_LABELS = {
    pending: "Menunggu",
    processing: "Diproses",
    paid: "Lunas",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    refunded: "Diretur",
};

const PAYMENT_LABELS = {
    pending: "Belum Bayar",
    paid: "Lunas",
    cancelled: "Dibatalkan",
    refunded: "Dikembalikan",
};

export default function CashierPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("unconfirmed");
    const [updatingId, setUpdatingId] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [cashReceived, setCashReceived] = useState("");
    const [cancelOrder, setCancelOrder] = useState(null);
    const [cancelReason, setCancelReason] = useState("Stok habis");
    const [historySearch, setHistorySearch] = useState("");
    const [historyFrom, setHistoryFrom] = useState("");
    const [historyTo, setHistoryTo] = useState("");
    const [refundOrder, setRefundOrder] = useState(null);
    const [orderSearch, setOrderSearch] = useState("");
    const [orderFrom, setOrderFrom] = useState("");
    const [orderTo, setOrderTo] = useState("");

    const openPayment = (order) => {
        setPaymentOrder(order);
        setPaymentMethod("cash");
        setCashReceived(String(order.total_price || ""));
    };

    const confirmPayment = async (event) => {
        event.preventDefault();
        const total = Number(paymentOrder.total_price) || 0;
        const received = Number(cashReceived) || 0;
        if (paymentMethod === "cash" && received < total) return;
        await updateStatus(paymentOrder.id, "paid", { payment_method: paymentMethod, cash_received: received });
        setPaymentOrder(null);
    };

    const confirmCancel = async (event) => {
        event.preventDefault();
        await updateStatus(cancelOrder.id, "cancelled", { cancel_reason: cancelReason });
        setCancelOrder(null);
    };

    const isPickup = (order) => ["pickup", "walkin", "ambil di toko"].includes(String(order.courier || "").toLowerCase());
    const shippingLabel = (order) => isPickup(order) ? "Ambil di Toko" : "Reguler Delivery";

    const fetchOrders = useCallback(async (t = tab, options = {}) => {
        const { silent = false } = options;
        if (!silent) setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams({ status: t });
            const search = t === "done" ? historySearch : orderSearch;
            const from = t === "done" ? historyFrom : orderFrom;
            const to = t === "done" ? historyTo : orderTo;
            if (search.trim()) params.set("search", search.trim());
            if (from) params.set("date_from", from);
            if (to) params.set("date_to", to);
            const res = await api.get(`/cashier/orders.php?${params.toString()}`);
            if (res.data && res.data.status === "success") {
                setOrders(res.data.data || []);
            } else {
                setError(res.data?.message || "Gagal memuat pesanan");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Gagal terhubung ke server");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [tab]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("demo") === "1") {
            setUser({ name: "Kasir POSMart", role: "cashier" });
            setOrders([
                {
                    id: 1042,
                    customer_name: "Budi Santoso",
                    phone: "081298765432",
                    address: "Jl. Margonda Raya No. 12, Depok",
                    status: "pending",
                    payment_status: "paid",
                    payment_method: "QRIS Midtrans",
                    total_price: 68500,
                    source_label: "Aplikasi Web",
                    transaction_at: "2026-11-06 07:10:00",
                    items: [
                        { id: 1, name: "Greenfields Susu UHT 950 ml", qty: 2, price: 24500, total: 49000 },
                        { id: 2, name: "Chiki Puffs Cheddar Cheese 60 g", qty: 1, price: 6900, total: 6900 }
                    ]
                },
                {
                    id: 1041,
                    customer_name: "Siti Rahma",
                    phone: "085712349988",
                    address: "Ambil di toko (Pickup)",
                    courier: "walkin",
                    status: "processing",
                    payment_status: "paid",
                    payment_method: "Tunai (Kasir)",
                    total_price: 31900,
                    source_label: "Layar Kasir POS",
                    transaction_at: "2026-11-06 07:05:00",
                    items: [
                        { id: 3, name: "Gatsby White Up EDT Sky Reflection 50 ml", qty: 1, price: 31900, total: 31900 }
                    ]
                }
            ]);
            setLoading(false);
            return;
        }
        const profile = localStorage.getItem("user_profile");
        if (profile) {
            try {
                const p = JSON.parse(profile);
                setUser(p);
                if (p.role !== "cashier" && p.role !== "admin" && p.role !== "owner") {
                    navigate("/");
                    return;
                }
            } catch {
                navigate("/login");
                return;
            }
        } else {
            navigate("/login");
            return;
        }
        fetchOrders("unconfirmed");
    }, [navigate, fetchOrders]);

    // Polling otomatis setiap 8 detik agar pesanan baru dari pelanggan langsung muncul
    useEffect(() => {
        const timer = setInterval(() => {
            fetchOrders(tab, { silent: true });
        }, 8000);
        return () => clearInterval(timer);
    }, [fetchOrders, tab]);

    const changeTab = (t) => {
        setTab(t);
        fetchOrders(t);
    };

    const confirmOrder = async (id) => {
        setUpdatingId(id);
        try {
            const res = await api.put("/cashier/orders.php", { id, status: "processing" });
            if (res.data && res.data.status === "success") {
                fetchOrders(tab);
            } else {
                alert(res.data?.message || "Gagal mengkonfirmasi pesanan");
            }
        } catch (err) {
            alert(err.response?.data?.message || "Gagal mengkonfirmasi pesanan");
        } finally {
            setUpdatingId(null);
        }
    };

    const updateStatus = async (id, status, payment = {}) => {
        setUpdatingId(id);
        try {
            const res = await api.put("/cashier/orders.php", { id, status, ...payment });
            if (res.data && res.data.status === "success") {
                fetchOrders(tab);
            } else {
                alert(res.data?.message || "Gagal mengubah status");
            }
        } catch (err) {
            alert(err.response?.data?.message || "Gagal mengubah status");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user_profile");
        navigate("/login");
    };

    const formatDateTime = (value) => value ? new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB" : "-";
    const statusBadge = {
        pending: "bg-rose-100 text-rose-700",
        processing: "bg-blue-100 text-blue-700",
        paid: "bg-emerald-100 text-emerald-700",
        completed: "bg-emerald-100 text-emerald-700",
        cancelled: "bg-slate-100 text-slate-600",
        refunded: "bg-amber-100 text-amber-700",
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo-icon.png?v=2" alt="POSMart" className="w-10 h-10 rounded-xl object-contain" />
                        <div>
                            <h1 className="text-lg font-black text-slate-900">Halaman Kasir</h1>
                            <p className="text-xs text-slate-500">{user?.name} • {user?.role}</p>
                            {paymentOrder && (
                                <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center">
                                    <form onSubmit={confirmPayment} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                                        <div className="flex items-start justify-between mb-5"><div><p className="text-xs font-bold text-slate-400">PEMBAYARAN ORDER #{paymentOrder.id}</p><h3 className="text-2xl font-black">Rp {Number(paymentOrder.total_price).toLocaleString("id-ID")}</h3></div><button type="button" onClick={() => setPaymentOrder(null)} className="text-slate-500">Tutup</button></div>
                                        <div className="grid grid-cols-3 gap-2 mb-4">{[["cash", "Tunai"], ["qris", "QRIS"], ["debit", "Debit"]].map(([value, label]) => <button type="button" key={value} onClick={() => setPaymentMethod(value)} className={`py-2 rounded-xl border text-sm font-bold ${paymentMethod === value ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200"}`}>{label}</button>)}</div>
                                        {paymentMethod === "cash" && <><label className="block text-sm font-bold">Uang diterima<input type="number" min={paymentOrder.total_price} value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} className="mt-2 w-full px-3 py-2.5 border border-slate-300 rounded-xl text-lg font-bold" required /></label><p className="mt-3 text-center text-sm text-slate-500">Kembalian <strong className="block text-2xl text-emerald-600">Rp {Math.max(0, Number(cashReceived) - Number(paymentOrder.total_price)).toLocaleString("id-ID")}</strong></p></>}
                                        <button className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black">Konfirmasi Pembayaran</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => navigate("/pos")} 
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black bg-lime text-ink border-2 border-ink rounded-xl hover:bg-[#bde85b] shadow-[2px_2px_0_#161616] cursor-pointer transition-transform active:translate-y-0.5"
                        >
                            <Monitor className="w-4 h-4" />
                            Buka Mesin Kasir (POS)
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                            <LogOut className="w-4 h-4" />
                            Keluar
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="sticky top-[73px] z-30 -mx-4 mb-6 flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <button onClick={() => changeTab("unconfirmed")} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === "unconfirmed" ? "bg-amber-500 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                        <Clock className="w-4 h-4 inline mr-2" />
                        Perlu Dikonfirmasi
                    </button>
                    <button onClick={() => changeTab("processing")} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === "processing" ? "bg-blue-500 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                        <Truck className="w-4 h-4 inline mr-2" />
                        Sedang Diproses
                    </button>
                    <button onClick={() => changeTab("done")} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === "done" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                        <CheckCircle2 className="w-4 h-4 inline mr-2" />
                        Selesai
                    </button>
                    <button onClick={() => changeTab("all")} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === "all" ? "bg-slate-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                        Semua
                    </button>
                    <button onClick={() => fetchOrders(tab)} className="ml-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                </div>
                {(tab === "done" || tab === "all") && (
                    <div className="mb-6 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto_auto_auto]">
                        <input value={tab === "done" ? historySearch : orderSearch} onChange={(event) => tab === "done" ? setHistorySearch(event.target.value) : setOrderSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && fetchOrders(tab)} placeholder="Cari ID order / nama pelanggan" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <input type="date" value={tab === "done" ? historyFrom : orderFrom} onChange={(event) => tab === "done" ? setHistoryFrom(event.target.value) : setOrderFrom(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" aria-label="Tanggal mulai" />
                        <input type="date" value={tab === "done" ? historyTo : orderTo} onChange={(event) => tab === "done" ? setHistoryTo(event.target.value) : setOrderTo(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" aria-label="Tanggal akhir" />
                        <button onClick={() => fetchOrders(tab)} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white">Cari Transaksi</button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 text-slate-500">Memuat...</div>
                ) : error ? (
                    <div className="text-center py-12 text-rose-500">{error}</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">Tidak ada pesanan</div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg font-black text-slate-900">Order #{order.id}</span>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge[order.status] || "bg-slate-100 text-slate-600"}`}>{STATUS_LABELS[order.status] || order.status}</span>
                                            {order.payment_status === "pending" && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-semibold rounded-full">MENUNGGU BAYAR</span>}
                                        </div>
                                        <p className="text-sm text-slate-500">{order.customer_name} • <a href={`https://wa.me/${String(order.phone || '').replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" />{order.phone}</a></p>
                                        <p className="text-xs text-slate-400 mt-1 inline-flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {order.address || "Alamat tidak tersedia"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-slate-900">Rp {Number(order.total_price).toLocaleString("id-ID")}</p>
                                        <p className="text-xs text-slate-500">{formatDateTime(order.transaction_at)}</p>
                                        <p className="text-xs font-semibold text-slate-500">{order.source_label}</p>
                                        <div className="mt-1 flex justify-end gap-1.5 text-[11px]">
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">{order.payment_method || order.payment_type || "Belum dipilih"}</span>
                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">{shippingLabel(order)}</span>
                                        </div>
                                    </div>
                                </div>

                                {order.items && order.items.length > 0 && (
                                    <div className="my-3">
                                      <button onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-700"><ChevronDown className={`w-4 h-4 transition-transform ${expandedOrders[order.id] ? 'rotate-180' : ''}`} /> Lihat {order.items.length} barang</button>
                                      {(tab === "processing" || expandedOrders[order.id]) && <div className="mt-2 py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700">
                                        <p className="font-bold text-slate-800 mb-1.5">Daftar Barang Pesanan:</p>
                                        <div className="space-y-1">
                                            {order.items.map((it, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-0.5">
                                                    <span className="font-medium text-slate-800">
                                                        {it.product?.name || `Produk #${it.product_id}`} <span className="font-black text-emerald-600">x{it.qty}</span>
                                                    </span>
                                                    <span className="font-semibold text-slate-600">
                                                        Rp {Number(it.total || (it.price * it.qty)).toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                      </div>}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2 justify-between pt-2 border-t border-slate-100">
                                    <span className="text-xs text-slate-500">Kasir: <span className="font-semibold text-slate-700">{order.cashier_name || "Belum tercatat"}</span></span>
                                    <div className="flex flex-wrap gap-2">
                                        {tab === "unconfirmed" && (
                                            <>
                                                {order.payment_status === "paid" ? (
                                                    <button
                                                        disabled={updatingId === order.id}
                                                        onClick={() => confirmOrder(order.id)}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {updatingId === order.id ? "Memproses..." : "Konfirmasi & Proses"}
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={updatingId === order.id}
                                                        onClick={() => openPayment(order)}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {updatingId === order.id ? "Memproses..." : "Terima Pembayaran (Lunas)"}
                                                    </button>
                                                )}
                                                <button
                                                    disabled={updatingId === order.id}
                                                    onClick={() => setCancelOrder(order)}
                                                    className="px-3 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-200 disabled:opacity-50 cursor-pointer"
                                                >
                                                    <Ban className="w-4 h-4 inline mr-1" />
                                                    Batalkan
                                                </button>
                                            </>
                                        )}
                                        {tab === "done" && (
                                            <>
                                                <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"><Printer className="w-4 h-4 inline mr-1" /> Cetak Struk</button>
                                                <button onClick={() => setRefundOrder(order)} className="px-2 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="Opsi retur"><MoreVertical className="w-4 h-4" /></button>
                                            </>
                                        )}
                                        {tab === "processing" && (
                                            <>
                                                <button
                                                    disabled={updatingId === order.id}
                                                    onClick={() => updateStatus(order.id, "completed")}
                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                                                >
                                                    {isPickup(order) ? "Pesanan Siap Diambil" : "Panggil Kurir / Kirim"}
                                                </button>
                                                <button onClick={() => window.print()} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200"><Printer className="w-4 h-4 inline mr-1" /> Cetak Label</button>
                                                <button
                                                    disabled={updatingId === order.id}
                                                    onClick={() => setCancelOrder(order)}
                                                    className="px-3 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-200 disabled:opacity-50 cursor-pointer"
                                                >
                                                    <Ban className="w-4 h-4 inline mr-1" />
                                                    Batalkan
                                                </button>
                                            </>
                                        )}
                                        {tab === "all" && (
                                            <>
                                                {order.status === "pending" && order.payment_status === "pending" && (
                                                    <button
                                                        disabled={updatingId === order.id}
                                                        onClick={() => openPayment(order)}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        Terima Bayar
                                                    </button>
                                                )}
                                                {(order.status === "pending" || order.status === "paid") && (
                                                    <button
                                                        disabled={updatingId === order.id || order.payment_status !== "paid"}
                                                        onClick={() => confirmOrder(order.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${order.payment_status === "paid" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                                                    >
                                                        Proses
                                                    </button>
                                                )}
                                                {order.status === "processing" && (
                                                    <button
                                                        disabled={updatingId === order.id}
                                                        onClick={() => updateStatus(order.id, "completed")}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {isPickup(order) ? "Siap Diambil" : "Kirim"}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            {cancelOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <form onSubmit={confirmCancel} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-slate-900">Batalkan Order #{cancelOrder.id}?</h2>
                        <p className="mt-2 text-sm text-slate-500">Pesanan tidak akan langsung dibatalkan tanpa konfirmasi.</p>
                        <label className="mt-4 block text-sm font-bold text-slate-700">Alasan pembatalan
                            <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5">
                                <option>Stok habis</option>
                                <option>Permintaan pembeli</option>
                                <option>Alamat atau data pesanan tidak valid</option>
                            </select>
                        </label>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setCancelOrder(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Kembali</button>
                            <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Ya, Batalkan</button>
                        </div>
                    </form>
                </div>
            )}
            {refundOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <form onSubmit={async (event) => { event.preventDefault(); await updateStatus(refundOrder.id, "refunded"); setRefundOrder(null); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-slate-900">Proses Retur Order #{refundOrder.id}?</h2>
                        <p className="mt-2 text-sm text-slate-500">Status pembayaran akan ditandai dikembalikan. Pastikan barang dan nominal retur sudah diverifikasi.</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setRefundOrder(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Batal</button>
                            <button type="submit" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white">Konfirmasi Retur</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
