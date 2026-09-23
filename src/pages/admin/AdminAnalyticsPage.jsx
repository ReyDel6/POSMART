import { useState, useEffect, useCallback } from 'react';
import {
    RefreshCcw,
    TrendingUp,
    TrendingDown,
    Wallet,
    ShoppingBag,
    Boxes,
    ReceiptText,
    BatteryWarning,
    PackageX,
    ShieldCheck,
    CalendarClock,
    FireExtinguisher,
    Loader2,
} from 'lucide-react';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import api from '../../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const STATUS_STYLE = {
    'Habis': { bg: 'bg-red-50 text-red-700 border-red-200', icon: PackageX },
    'Segera Restock': { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: FireExtinguisher },
    'Amankan': { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: ShieldCheck },
    'Tidak Bergerak': { bg: 'bg-slate-100 text-slate-500 border-slate-200', icon: BatteryWarning },
    'Aman': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShieldCheck },
};

const PERIODS = [7, 14, 30, 90];

const BAR_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` Rp ${Number(ctx.raw || 0).toLocaleString('id-ID')}` } } },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { font: { size: 10 }, callback: (v) => v >= 1000 ? `${(v / 1000)}rb` : v } },
    },
};

export default function AdminAnalyticsPage() {
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback((d) => {
        setLoading(true);
        setError('');
        api.get(`/admin/analytics.php?days=${d}`)
            .then(res => {
                if (res.data?.status === 'success') setData(res.data.data);
                else setError(res.data?.message || 'Gagal memuat analitik.');
            })
            .catch(() => setError('Gagal memuat analitik.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchData(days); }, [days, fetchData]);

    const delta = (pct) => {
        const up = Number(pct) >= 0;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(Number(pct)).toLocaleString('id-ID')}% vs periode sblm.
            </span>
        );
    };

    const kpi = (icon, label, value, sub) => (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">{icon}</span>
                <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-xl font-black text-slate-900">{value}</p>
            <div className="mt-2">{sub}</div>
        </div>
    );

    const hourlyData = data && {
        labels: data.hourly.map(h => String(h.hour).padStart(2, '0')),
        datasets: [{ label: 'Omzet', data: data.hourly.map(h => h.total_sales), backgroundColor: '#059669', borderRadius: 4 }],
    };

    const weekdayData = data && {
        labels: data.weekday.map(w => w.name.slice(0, 3)),
        datasets: [{ label: 'Omzet', data: data.weekday.map(w => w.total_sales), backgroundColor: '#10b981', borderRadius: 4 }],
    };

    const bandData = data && {
        labels: data.price_bands.map(b => b.band),
        datasets: [{ label: 'Omzet', data: data.price_bands.map(b => b.revenue), backgroundColor: '#0d9488', borderRadius: 4 }],
    };

    return (
        <div className="space-y-6">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold">⚠️ {error}</div>}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-800">Analitik Penjualan (EDA) & Smart Restock</h3>
                    <p className="text-xs text-slate-500">Ritme penjualan, pola jam/hari, distribusi harga, dan saran stok ulang otomatis.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
                        {PERIODS.map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${days === d ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {d} hari
                            </button>
                        ))}
                    </div>
                    <button onClick={() => fetchData(days)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors" title="Muat ulang">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-20 flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-sm font-semibold">Menghitung analitik...</p>
                </div>
            ) : !data ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center text-slate-400 text-sm">Belum ada data.</div>
            ) : (
                <>
                    {/* ===== KPI ===== */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        {kpi(<Wallet className="w-4 h-4" />, 'Omzet', formatRupiah(data.summary.revenue), delta(data.summary.revenue_pct))}
                        {kpi(<ReceiptText className="w-4 h-4" />, 'Transaksi', data.summary.orders.toLocaleString('id-ID'), delta(data.summary.orders_pct))}
                        {kpi(<Boxes className="w-4 h-4" />, 'Qty Terjual', data.summary.items_sold.toLocaleString('id-ID'), null)}
                        {kpi(<ShoppingBag className="w-4 h-4" />, 'Rata-rata / order', formatRupiah(data.summary.aov), null)}
                        {kpi(<CalendarClock className="w-4 h-4" />, 'Proyeksi bulan ini', formatRupiah(data.summary.projected), <p className="text-[10px] text-slate-400">dari {data.period.days} hari terakhir</p>)}
                    </div>

                    {/* ===== Grafik ===== */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-1">
                            <h4 className="font-black text-slate-900 text-sm mb-1">Ritme per Jam</h4>
                            <p className="text-[11px] text-slate-400 mb-4">Kapan omzet paling deras (untuk jadwal staf & kurir)</p>
                            <div className="h-52"><Bar data={hourlyData} options={BAR_OPTS} /></div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-1">
                            <h4 className="font-black text-slate-900 text-sm mb-1">Per Hari dalam Seminggu</h4>
                            <p className="text-[11px] text-slate-400 mb-4">Pola mingguan pelanggan</p>
                            <div className="h-52"><Bar data={weekdayData} options={BAR_OPTS} /></div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-1">
                            <h4 className="font-black text-slate-900 text-sm mb-1">Distribusi Harga Produk</h4>
                            <p className="text-[11px] text-slate-400 mb-4">Omzet per rentang harga</p>
                            <div className="h-52"><Bar data={bandData} options={BAR_OPTS} /></div>
                        </div>
                    </div>

                    {/* ===== Smart Restock ===== */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-slate-100">
                            <div>
                                <h4 className="font-black text-slate-900 text-sm">Smart Restock</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">Berdasarkan penjualan {data.period.days} hari terakhir; usul stok = 14 hari rata-rata penjualan.</p>
                            </div>
                            <div className="flex gap-2 text-[10px] font-black">
                                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">{data.restock_stats.jenis_habis} habis</span>
                                <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">{data.restock_stats.jenis_butuh} segera</span>
                                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{data.restock_stats.total_reorder} pcs usul</span>
                            </div>
                        </div>
                        {data.restock.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-12">Belum ada data penjualan untuk periode ini.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                            <th className="px-6 py-3">Produk</th>
                                            <th className="px-4 py-3 text-right">Terjual</th>
                                            <th className="px-4 py-3 text-right">Rata/hari</th>
                                            <th className="px-4 py-3 text-right">Stok</th>
                                            <th className="px-4 py-3 text-right">Sisa hari</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-6 py-3 text-right">Usul Restock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.restock.map((r) => {
                                            const st = STATUS_STYLE[r.status] || STATUS_STYLE.Tidak;
                                            const StIcon = st.icon;
                                            const coverage = r.coverage === null ? '–' : `${r.coverage.toLocaleString('id-ID')} hr`;
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <img src={r.image || 'https://placehold.co/100x100?text=No'} alt={r.name} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=No'; }} className="w-9 h-9 rounded-lg object-cover bg-slate-100 border border-slate-100" />
                                                            <div>
                                                                <p className="font-bold text-slate-800">{r.name}</p>
                                                                <p className="text-[10px] text-slate-400">{r.category} · {formatRupiah(r.price)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{r.qty_sold}</td>
                                                    <td className="px-4 py-3 text-right text-slate-500">{r.avg_daily}</td>
                                                    <td className={`px-4 py-3 text-right font-black ${r.stock === 0 ? 'text-red-600' : r.coverage !== null && r.coverage <= 4 ? 'text-orange-600' : 'text-slate-800'}`}>{r.stock}</td>
                                                    <td className="px-4 py-3 text-right text-slate-500">{coverage}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-black ${st.bg}`}>
                                                            <StIcon className="w-3 h-3" /> {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {r.recommended > 0 ? (
                                                            <span className="inline-block bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-lg">+{r.recommended} pcs</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-300 font-bold">–</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ===== Dead Stock ===== */}
                    {data.dead_stock.length > 0 && (
                        <div className="bg-white border border-orange-100 rounded-2xl shadow-sm p-6">
                            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                                <PackageX className="w-4 h-4 text-orange-500" /> Barang Tidur (<span className="text-orange-600">{data.dead_stock.length}</span>)
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 mb-4">Produk punya stok tapi tak ada penjualan dalam periode — pertimbangkan promo/diskon atau pelajari ulang.</p>
                            <div className="flex flex-wrap gap-2">
                                {data.dead_stock.map((d) => (
                                    <span key={d.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50/70 border border-orange-100 text-xs text-slate-600">
                                        <span className="font-bold">{d.name}</span>
                                        <span className="text-slate-400">· {d.category}</span>
                                        <span className="text-orange-600 font-black">stok {d.stock}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}