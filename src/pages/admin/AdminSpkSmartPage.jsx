import { useState, useEffect, useCallback } from 'react';
import {
    Sliders,
    Award,
    Calculator,
    Boxes,
    TrendingUp,
    DollarSign,
    Save,
    RotateCcw,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    ShieldCheck,
    Loader2,
    Sparkles,
    Info,
    ArrowUpRight,
    ShoppingBag,
    Calendar,
    Download,
    X,
    Filter,
} from 'lucide-react';
import api from '../../utils/api';

const formatRupiah = (v) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);

const PERIODS = [
    { label: '7 Hari', value: 7 },
    { label: '14 Hari', value: 14 },
    { label: '30 Hari', value: 30 },
    { label: '90 Hari', value: 90 },
];

export default function AdminSpkSmartPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [activeTab, setActiveTab] = useState('ranking'); // 'ranking' | 'weights' | 'matrix'
    const [days, setDays] = useState(30);
    const [filterPriority, setFilterPriority] = useState('all'); // 'all' | 'Sangat Mendesak' | 'Perlu Restock' | 'Stok Aman'

    // Form bobot kriteria
    const [weights, setWeights] = useState({
        c1_stock: 40,
        c2_sales: 35,
        c3_price: 25,
    });

    // Modal restock cepat
    const [restockItem, setRestockItem] = useState(null);
    const [restockQty, setRestockQty] = useState('');
    const [restocking, setRestocking] = useState(false);

    // Fetch data SPK SMART
    const fetchData = useCallback((d = days) => {
        setLoading(true);
        setError('');
        api.get(`/admin/spk-smart.php?days=${d}`)
            .then((res) => {
                if (res.data?.status === 'success') {
                    setData(res.data.data);
                    // Sinkronkan input weights dengan criteria yang tersimpan
                    const crit = res.data.data.criteria;
                    if (Array.isArray(crit)) {
                        const newW = {};
                        crit.forEach((c) => {
                            if (c.code === 'C1') newW.c1_stock = c.raw_weight;
                            if (c.code === 'C2') newW.c2_sales = c.raw_weight;
                            if (c.code === 'C3') newW.c3_price = c.raw_weight;
                        });
                        setWeights(newW);
                    }
                } else {
                    setError(res.data?.message || 'Gagal memuat perhitungan SPK SMART.');
                }
            })
            .catch((err) => {
                // Tampilkan pesan ramah pengguna tanpa membocorkan info SQL mentah
                const friendlyMsg = err.response?.data?.message || 'Gagal memuat perhitungan SPK SMART. Silakan coba lagi.';
                setError(friendlyMsg);
            })
            .finally(() => setLoading(false));
    }, [days]);

    useEffect(() => {
        fetchData(days);
    }, [days, fetchData]);

    // Handle ganti rentang waktu (C2)
    const handlePeriodChange = (newDays) => {
        setDays(newDays);
        fetchData(newDays);
    };

    // Handle simpan bobot (AD-08)
    const handleSaveWeights = (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMsg('');
        setError('');

        api.post('/admin/spk-smart/weights.php', weights)
            .then((res) => {
                if (res.data?.status === 'success') {
                    setSuccessMsg('Bobot kriteria berhasil disimpan & peringkat SMART telah dihitung ulang!');
                    fetchData(days);
                    setTimeout(() => setSuccessMsg(''), 4000);
                } else {
                    setError(res.data?.message || 'Gagal menyimpan bobot kriteria.');
                }
            })
            .catch((err) => {
                setError(err.response?.data?.message || 'Gagal menyimpan bobot kriteria. Silakan coba lagi.');
            })
            .finally(() => setSaving(false));
    };

    // Handle restock cepat produk terpilih
    const handleRestockSubmit = (e) => {
        e.preventDefault();
        const qty = parseInt(restockQty, 10);
        if (!restockItem || isNaN(qty) || qty <= 0) return;

        setRestocking(true);
        api.post('/admin/products/restock.php', { id: restockItem.product_id, quantity: qty })
            .then((res) => {
                if (res.data?.status === 'success') {
                    setSuccessMsg(`Stok ${restockItem.name} berhasil ditambah +${qty} pcs!`);
                    setRestockItem(null);
                    setRestockQty('');
                    fetchData(days);
                    setTimeout(() => setSuccessMsg(''), 4000);
                } else {
                    setError(res.data?.message || 'Gagal menambah stok.');
                }
            })
            .catch(() => setError('Gagal memproses restock.'))
            .finally(() => setRestocking(false));
    };

    // Ekspor Laporan CSV
    const handleExportCsv = () => {
        if (!data?.ranking || data.ranking.length === 0) return;

        const headers = [
            'Rank',
            'Barcode',
            'Nama Produk',
            'Kategori',
            'Sisa Stok (C1)',
            `Terjual ${days} Hari (C2)`,
            'Harga Jual (C3)',
            'Utilitas C1',
            'Utilitas C2',
            'Utilitas C3',
            'Skor Akhir SMART',
            'Status Prioritas',
            'Usul Belanja (pcs)',
        ];

        const rows = data.ranking.map((r) => [
            r.rank,
            `"${r.barcode}"`,
            `"${r.name.replace(/"/g, '""')}"`,
            `"${r.category}"`,
            r.raw.stock,
            r.raw.sales,
            r.raw.price,
            r.utility.u1_stock,
            r.utility.u2_sales,
            r.utility.u3_price,
            r.final_score,
            `"${r.priority}"`,
            r.suggested_qty,
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,\uFEFF' +
            [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Laporan_Rekomendasi_SPK_SMART_${days}Hari_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter data tabel ranking
    const filteredRanking = data?.ranking
        ? data.ranking.filter((item) => {
              if (filterPriority === 'all') return true;
              return item.priority === filterPriority;
          })
        : [];

    // Perhitungan kalkulasi bobot total di form
    const currentTotalWeight =
        (parseInt(weights.c1_stock, 10) || 0) +
        (parseInt(weights.c2_sales, 10) || 0) +
        (parseInt(weights.c3_price, 10) || 0);

    return (
        <div className="space-y-6">
            {/* Header Hero Banner (Kontras Tinggi & Compact) */}
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#042B17] rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-slate-800">
                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 shrink-0">
                                <Sparkles className="w-3 h-3 text-emerald-300" /> SPK SMART
                            </span>
                            <span 
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 border border-white/15 shrink-0"
                                style={{ color: '#ffffff' }}
                            >
                                Simple Multi-Attribute Rating Technique
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                                AD-08 & AD-09
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#ffffff' }}>
                            Sistem Pendukung Keputusan Pengadaan Barang
                        </h2>
                        <p className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed" style={{ color: '#E5E3D9' }}>
                            Algoritma metode SMART menghitung prioritas restock berdasarkan 
                            <span className="text-emerald-300 font-semibold"> Sisa Stok (C1)</span>, 
                            <span className="text-emerald-300 font-semibold"> Penjualan {days} Hari (C2)</span>, dan 
                            <span className="text-emerald-300 font-semibold"> Harga Jual (C3)</span>.
                        </p>
                    </div>

                    <div className="flex items-center justify-start lg:justify-end gap-2.5 lg:ml-auto shrink-0 flex-wrap sm:flex-nowrap">
                        {/* Filter Periode Penjualan (C2) */}
                        <div className="inline-flex items-center bg-black/50 border border-white/20 rounded-xl p-1 gap-1 shrink-0 shadow-inner">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => handlePeriodChange(p.value)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                        days === p.value
                                            ? 'bg-[#CBF169] font-black shadow-sm'
                                            : 'hover:bg-white/10'
                                    }`}
                                    style={{
                                        color: days === p.value ? '#161616' : '#E5E3D9',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Tombol Hitung Ulang */}
                        <button
                            onClick={() => fetchData(days)}
                            className="whitespace-nowrap px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                            style={{ color: '#ffffff' }}
                            title="Hitung Ulang SMART"
                        >
                            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ stroke: '#ffffff' }} />
                            <span className="font-bold" style={{ color: '#ffffff' }}>Hitung Ulang</span>
                        </button>
                    </div>
                </div>

                {/* Tabs Switcher (1 Baris Sejajar & Compact) */}
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/15 overflow-x-auto no-scrollbar flex-nowrap">
                    <button
                        data-tab="ranking"
                        onClick={() => setActiveTab('ranking')}
                        className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                            activeTab === 'ranking'
                                ? 'bg-[#CBF169] font-black shadow-md border-2 border-[#161616]'
                                : 'bg-white/10 hover:bg-white/20 border border-white/15 font-bold'
                        }`}
                        style={{
                            color: activeTab === 'ranking' ? '#161616' : '#ffffff',
                        }}
                    >
                        <Award className="w-3.5 h-3.5" style={{ stroke: activeTab === 'ranking' ? '#161616' : '#ffffff' }} />
                        <span>Peringkat Pengadaan (AD-09)</span>
                    </button>
                    <button
                        data-tab="weights"
                        onClick={() => setActiveTab('weights')}
                        className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                            activeTab === 'weights'
                                ? 'bg-[#CBF169] font-black shadow-md border-2 border-[#161616]'
                                : 'bg-white/10 hover:bg-white/20 border border-white/15 font-bold'
                        }`}
                        style={{
                            color: activeTab === 'weights' ? '#161616' : '#ffffff',
                        }}
                    >
                        <Sliders className="w-3.5 h-3.5" style={{ stroke: activeTab === 'weights' ? '#161616' : '#ffffff' }} />
                        <span>Bobot Kriteria (AD-08)</span>
                    </button>
                    <button
                        data-tab="matrix"
                        onClick={() => setActiveTab('matrix')}
                        className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                            activeTab === 'matrix'
                                ? 'bg-[#CBF169] font-black shadow-md border-2 border-[#161616]'
                                : 'bg-white/10 hover:bg-white/20 border border-white/15 font-bold'
                        }`}
                        style={{
                            color: activeTab === 'matrix' ? '#161616' : '#ffffff',
                        }}
                    >
                        <Calculator className="w-3.5 h-3.5" style={{ stroke: activeTab === 'matrix' ? '#161616' : '#ffffff' }} />
                        <span>Matriks & Utilitas Perhitungan</span>
                    </button>
                </div>
            </div>

            {/* Alert Notifikasi */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                        <span>{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-600 p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* KPI Summary Cards (Sejajar Sempurna Secara Horizontal) */}
            {data?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Card 1: Total Alternatif */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    <Boxes className="w-3.5 h-3.5" />
                                </span>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                                    Total Alternatif
                                </p>
                            </div>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                {data.summary.total_products} <span className="text-sm font-bold text-slate-500">Produk</span>
                            </p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 whitespace-nowrap truncate">
                            Periode {days} hari terakhir
                        </p>
                    </div>

                    {/* Card 2: Sangat Mendesak */}
                    <div className="bg-white border-2 border-red-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full bg-gradient-to-br from-white to-red-50/50">
                        <div>
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                </span>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-red-600 whitespace-nowrap truncate">
                                    Sangat Mendesak
                                </p>
                            </div>
                            <p className="text-2xl font-black text-red-700 tracking-tight">
                                {data.summary.high_priority} <span className="text-sm font-bold text-red-500">Produk</span>
                            </p>
                        </div>
                        <p className="text-[11px] text-red-600 font-semibold mt-2 pt-2 border-t border-red-100 whitespace-nowrap truncate">
                            Segera order supplier
                        </p>
                    </div>

                    {/* Card 3: Perlu Restock */}
                    <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full bg-gradient-to-br from-white to-amber-50/50">
                        <div>
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 whitespace-nowrap truncate">
                                    Perlu Restock
                                </p>
                            </div>
                            <p className="text-2xl font-black text-amber-700 tracking-tight">
                                {data.summary.medium_priority} <span className="text-sm font-bold text-amber-500">Produk</span>
                            </p>
                        </div>
                        <p className="text-[11px] text-amber-600 font-semibold mt-2 pt-2 border-t border-amber-100 whitespace-nowrap truncate">
                            Jadwal restock berkala
                        </p>
                    </div>

                    {/* Card 4: Stok Aman */}
                    <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full bg-gradient-to-br from-white to-emerald-50/50">
                        <div>
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                </span>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 whitespace-nowrap truncate">
                                    Stok Aman
                                </p>
                            </div>
                            <p className="text-2xl font-black text-emerald-700 tracking-tight">
                                {data.summary.low_priority} <span className="text-sm font-bold text-emerald-500">Produk</span>
                            </p>
                        </div>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-2 pt-2 border-t border-emerald-100 whitespace-nowrap truncate">
                            Pasokan aman terkendali
                        </p>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 1: REKOMENDASI PENGADAAN (AD-09) */}
            {/* ========================================================================= */}
            {activeTab === 'ranking' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-500" />
                                Hasil Peringkat Rekomendasi Pengadaan Barang (AD-09)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Berdasarkan data penjualan {days} hari terakhir. Diurutkan dari nilai evaluasi SMART tertinggi: V(Ai) = ∑ (Wj × u_ij).
                            </p>
                        </div>

                        {/* Filter Status Prioritas & Tombol Ekspor CSV */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                <button
                                    onClick={() => setFilterPriority('all')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                        filterPriority === 'all'
                                            ? 'bg-white text-slate-900 shadow-sm font-black'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Semua ({data?.ranking?.length || 0})
                                </button>
                                <button
                                    onClick={() => setFilterPriority('Sangat Mendesak')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                        filterPriority === 'Sangat Mendesak'
                                            ? 'bg-red-500 text-white font-black shadow-sm'
                                            : 'text-red-600 hover:bg-red-50'
                                    }`}
                                >
                                    Mendesak ({data?.summary?.high_priority || 0})
                                </button>
                                <button
                                    onClick={() => setFilterPriority('Perlu Restock')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                        filterPriority === 'Perlu Restock'
                                            ? 'bg-amber-500 text-white font-black shadow-sm'
                                            : 'text-amber-600 hover:bg-amber-50'
                                    }`}
                                >
                                    Perlu ({data?.summary?.medium_priority || 0})
                                </button>
                            </div>

                            <button
                                onClick={handleExportCsv}
                                disabled={!data?.ranking || data.ranking.length === 0}
                                className="px-3.5 py-2 rounded-xl bg-lime text-ink border-2 border-ink text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#161616] disabled:opacity-50"
                                style={{ color: '#161616', background: '#CBF169' }}
                                title="Ekspor Rekomendasi ke File CSV/Excel"
                            >
                                <Download className="w-3.5 h-3.5" style={{ stroke: '#161616' }} />
                                <span>Ekspor CSV / Excel</span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            <p className="text-sm font-semibold">Menghitung peringkat SMART dari database...</p>
                        </div>
                    ) : filteredRanking.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 text-sm">
                            Tidak ada barang dalam filter prioritas ini.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/75 border-b border-slate-100">
                                        <th className="px-6 py-4 text-center w-20">Rank</th>
                                        <th className="px-6 py-4">Informasi Produk</th>
                                        <th className="px-4 py-4 text-center">Sisa Stok (C1)</th>
                                        <th className="px-4 py-4 text-center">Terjual {days}hr (C2)</th>
                                        <th className="px-4 py-4 text-right">Harga (C3)</th>
                                        <th className="px-6 py-4 text-center">Skor SMART</th>
                                        <th className="px-6 py-4 text-center">Tingkat Urgensi</th>
                                        <th className="px-6 py-4 text-right">Usul Belanja</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRanking.map((item) => {
                                        const isTop3 = item.rank <= 3;
                                        const rankBadge =
                                            item.rank === 1
                                                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/30 ring-2 ring-amber-300'
                                                : item.rank === 2
                                                ? 'bg-slate-300 text-slate-900 font-black shadow-sm ring-2 ring-slate-200'
                                                : item.rank === 3
                                                ? 'bg-amber-700 text-amber-50 font-black shadow-sm'
                                                : 'bg-slate-100 text-slate-600 font-bold';

                                        const priorityBadge =
                                            item.priority_class === 'danger'
                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                : item.priority_class === 'warning'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                                        return (
                                            <tr
                                                key={item.product_id}
                                                className={`hover:bg-slate-50/80 transition-colors ${
                                                    isTop3 ? 'bg-amber-50/20' : ''
                                                }`}
                                            >
                                                {/* Kolom Rank */}
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs ${rankBadge}`}
                                                    >
                                                        #{item.rank}
                                                    </span>
                                                </td>

                                                {/* Kolom Produk */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://placehold.co/100x100?text=Produk';
                                                            }}
                                                            className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                                                        />
                                                        <div>
                                                            <p className="font-bold text-slate-900 leading-snug">
                                                                {item.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[11px] font-mono font-semibold text-slate-400">
                                                                    {item.barcode}
                                                                </span>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                    {item.category}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* C1: Stok */}
                                                <td className="px-4 py-4 text-center">
                                                    <span
                                                        className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                                                            item.raw.stock === 0
                                                                ? 'bg-red-100 text-red-700'
                                                                : item.raw.stock <= 5
                                                                ? 'bg-orange-100 text-orange-700'
                                                                : 'bg-slate-100 text-slate-800'
                                                        }`}
                                                    >
                                                        {item.raw.stock} pcs
                                                    </span>
                                                </td>

                                                {/* C2: Penjualan */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {item.raw.sales} terjual
                                                    </span>
                                                </td>

                                                {/* C3: Harga */}
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        {formatRupiah(item.raw.price)}
                                                    </span>
                                                </td>

                                                {/* Skor SMART */}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="text-sm font-black text-slate-900">
                                                            {item.final_score.toFixed(4)}
                                                        </span>
                                                        <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    item.score_percent >= 65
                                                                        ? 'bg-red-500'
                                                                        : item.score_percent >= 40
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-emerald-500'
                                                                }`}
                                                                style={{ width: `${Math.min(100, item.score_percent)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Tingkat Urgensi */}
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${priorityBadge}`}
                                                    >
                                                        {item.priority_class === 'danger' && (
                                                            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                                                        )}
                                                        {item.priority_class === 'warning' && (
                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                                        )}
                                                        {item.priority_class === 'normal' && (
                                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                        )}
                                                        {item.priority}
                                                    </span>
                                                </td>

                                                {/* Usul Belanja */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                                        +{item.suggested_qty} pcs
                                                    </span>
                                                </td>

                                                {/* Tombol Restock */}
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setRestockItem(item);
                                                            setRestockQty(String(item.suggested_qty));
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl border-2 border-ink text-xs font-black transition-all cursor-pointer shadow-[2px_2px_0_#161616] flex items-center gap-1 mx-auto hover:-translate-y-0.5"
                                                        style={{ color: '#F6F4EC', background: '#161616' }}
                                                    >
                                                        <span>+ Restock</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PENGATURAN BOBOT KRITERIA (AD-08) */}
            {/* ========================================================================= */}
            {activeTab === 'weights' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                        <div>
                            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                                <Sliders className="w-5 h-5 text-emerald-600" />
                                Pengaturan Bobot Kriteria Pengadaan (AD-08)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                                Sesuai prosedur AD-08, Pemilik Toko mengatur nilai bobot awal untuk setiap kriteria pengadaan. 
                                Sistem akan menormalisasi bobot menjadi desimal (total = 1.0) untuk perhitungan evaluasi SMART.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                            <span>Total Bobot Mentah:</span>
                            <span className="text-base font-black text-emerald-600">{currentTotalWeight}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSaveWeights} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Kriteria C1: Stok */}
                            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 relative hover:border-emerald-300 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-black font-mono">
                                        C1 (Cost)
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">
                                        Normalisasi: {((weights.c1_stock / (currentTotalWeight || 1)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <Boxes className="w-5 h-5 text-red-500" /> Sisa Stok Fisik
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Sifat <strong>Cost</strong>: Semakin sedikit jumlah stok yang tersisa di toko, maka tingkat kebutuhan belanja barang tersebut semakin tinggi.
                                </p>

                                <div className="mt-6">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                                        <span>Nilai Bobot:</span>
                                        <span className="text-lg font-black text-slate-900">{weights.c1_stock}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={weights.c1_stock}
                                        onChange={(e) => setWeights({ ...weights, c1_stock: parseInt(e.target.value, 10) || 1 })}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    />
                                </div>
                            </div>

                            {/* Kriteria C2: Penjualan */}
                            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 relative hover:border-emerald-300 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black font-mono">
                                        C2 (Benefit)
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">
                                        Normalisasi: {((weights.c2_sales / (currentTotalWeight || 1)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" /> Volume Penjualan ({days} Hari)
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Sifat <strong>Benefit</strong>: Semakin laris produk terjual dalam periode terpilih, semakin tinggi prioritas untuk segera restock kembali.
                                </p>

                                <div className="mt-6">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                                        <span>Nilai Bobot:</span>
                                        <span className="text-lg font-black text-slate-900">{weights.c2_sales}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={weights.c2_sales}
                                        onChange={(e) => setWeights({ ...weights, c2_sales: parseInt(e.target.value, 10) || 1 })}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    />
                                </div>
                            </div>

                            {/* Kriteria C3: Harga */}
                            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 relative hover:border-emerald-300 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-black font-mono">
                                        C3 (Benefit)
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">
                                        Normalisasi: {((weights.c3_price / (currentTotalWeight || 1)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-blue-500" /> Nilai Harga & Omzet
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Sifat <strong>Benefit</strong>: Produk bernilai jual tinggi diprioritaskan agar toko tidak kehilangan potensi omzet transaksi harian.
                                </p>

                                <div className="mt-6">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                                        <span>Nilai Bobot:</span>
                                        <span className="text-lg font-black text-slate-900">{weights.c3_price}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={weights.c3_price}
                                        onChange={(e) => setWeights({ ...weights, c3_price: parseInt(e.target.value, 10) || 1 })}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Petunjuk Formula Normalisasi */}
                        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                            <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-emerald-950">Rumus Normalisasi Bobot Metode SMART:</p>
                                <p className="mt-1 font-mono text-[11px] text-emerald-800">
                                    Wj = wj / ∑(w1 + w2 + w3) &rarr; W1 = {(weights.c1_stock / (currentTotalWeight || 1)).toFixed(4)}, W2 = {(weights.c2_sales / (currentTotalWeight || 1)).toFixed(4)}, W3 = {(weights.c3_price / (currentTotalWeight || 1)).toFixed(4)} (Total = 1.0000)
                                </p>
                            </div>
                        </div>

                        {/* Tombol Simpan */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setWeights({ c1_stock: 40, c2_sales: 35, c3_price: 25 })}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                            >
                                Reset ke Default (40 : 35 : 25)
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Menyimpan...' : 'Simpan & Terapkan Bobot (AD-08)'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: MATRIKS & UTILITAS PERHITUNGAN MATEMATIS */}
            {/* ========================================================================= */}
            {activeTab === 'matrix' && (
                <div className="space-y-6">
                    {/* Matriks 1: Data Alternatif Awal */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
                        <div className="mb-4">
                            <h4 className="font-black text-slate-900 text-sm">
                                1. Matriks Keputusan Awal (Data Nilai Kriteria Produk)
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Menampilkan nilai mentah dari masing-masing alternatif produk untuk setiap kriteria.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left font-black text-slate-400 bg-slate-50 border-b border-slate-100 uppercase">
                                        <th className="px-4 py-3">No</th>
                                        <th className="px-4 py-3">Nama Produk (Alternatif Ai)</th>
                                        <th className="px-4 py-3 text-center">C1: Stok (Cost)</th>
                                        <th className="px-4 py-3 text-center">C2: Terjual {days}hr (Benefit)</th>
                                        <th className="px-4 py-3 text-right">C3: Harga (Benefit)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data?.ranking?.map((r, i) => (
                                        <tr key={r.product_id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-2.5 font-bold text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-2.5 font-bold text-slate-800">{r.name}</td>
                                            <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-700">
                                                {r.raw.stock}
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-700">
                                                {r.raw.sales}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">
                                                {formatRupiah(r.raw.price)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Matriks 2: Nilai Utilitas Normalisasi */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
                        <div className="mb-4">
                            <h4 className="font-black text-slate-900 text-sm">
                                2. Matriks Normalisasi Nilai Utilitas u(Cj) & Nilai Akhir SMART
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Formula Cost: u(C1) = (C1_max - C1_i) / (C1_max - C1_min) | Formula Benefit: u(Cj) = (Cj_i - Cj_min) / (Cj_max - Cj_min).
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left font-black text-slate-400 bg-slate-50 border-b border-slate-100 uppercase">
                                        <th className="px-4 py-3">Rank</th>
                                        <th className="px-4 py-3">Alternatif (Produk)</th>
                                        <th className="px-4 py-3 text-center">u(C1) [Stok]</th>
                                        <th className="px-4 py-3 text-center">u(C2) [Penjualan]</th>
                                        <th className="px-4 py-3 text-center">u(C3) [Harga]</th>
                                        <th className="px-4 py-3 text-right">Nilai Akhir V(Ai)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data?.ranking?.map((r) => (
                                        <tr key={r.product_id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-2.5 font-black text-slate-900">#{r.rank}</td>
                                            <td className="px-4 py-2.5 font-bold text-slate-800">{r.name}</td>
                                            <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                                                {r.utility.u1_stock.toFixed(4)}
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                                                {r.utility.u2_sales.toFixed(4)}
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                                                {r.utility.u3_price.toFixed(4)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-600 text-sm">
                                                {r.final_score.toFixed(4)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Quick Restock */}
            {restockItem && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-black text-slate-900 text-lg">Restock Produk Pengadaan</h3>
                                <p className="text-xs text-slate-500">Berdasarkan usul rekomendasi SPK SMART</p>
                            </div>
                            <button
                                onClick={() => setRestockItem(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRestockSubmit} className="mt-6 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Produk Terpilih:</p>
                                <p className="font-black text-slate-900 text-sm mt-0.5">{restockItem.name}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-semibold">
                                    <span>Sisa Stok: <strong className="text-slate-800">{restockItem.raw.stock} pcs</strong></span>
                                    <span>•</span>
                                    <span>Skor SPK: <strong className="text-emerald-700">{restockItem.final_score}</strong></span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                    Jumlah Kuantitas Belanja (pcs):
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={restockQty}
                                    onChange={(e) => setRestockQty(e.target.value)}
                                    placeholder="Contoh: 25"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-base font-bold text-slate-900"
                                    autoFocus
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Usul kuantitas ideal SMART: <strong>+{restockItem.suggested_qty} pcs</strong>
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setRestockItem(null)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={restocking}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-60"
                                >
                                    {restocking ? 'Memproses...' : 'Konfirmasi Tambah Stok'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
