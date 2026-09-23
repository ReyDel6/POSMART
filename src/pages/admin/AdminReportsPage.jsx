import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarDays, Download, DollarSign, Package, RefreshCcw, ShoppingBag, TrendingUp } from 'lucide-react';
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import api from '../../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const periodDays = { hari_ini: 1, minggu_ini: 7, bulan_ini: 30, tahun_ini: 365 };

export default function AdminReportsPage() {
    const [period, setPeriod] = useState('bulan_ini');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReport = useCallback(async () => {
        try {
            const response = await api.get(`/admin/reports.php?days=${periodDays[period]}`);
            if (response.data?.status === 'success') setReport(response.data.data);
            else setError(response.data?.message || 'Gagal memuat laporan.');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal terhubung ke server.');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        let ignore = false;
        api.get(`/admin/reports.php?days=${periodDays[period]}`)
            .then(response => {
                if (ignore) return;
                if (response.data?.status === 'success') setReport(response.data.data);
                else setError(response.data?.message || 'Gagal memuat laporan.');
            })
            .catch(err => {
                if (ignore) return;
                setError(err.response?.data?.message || 'Gagal terhubung ke server.');
            })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, [period]);

    const formatRupiah = (value) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(Number(value) || 0);

    const filteredSales = useMemo(() => {
        if (!report?.daily_sales) return [];
        return report.daily_sales;
    }, [report]);

    const categorySales = useMemo(() => {
        if (!report?.category_sales) return [];
        return report.category_sales;
    }, [report]);

    const totalRevenue = filteredSales.reduce((sum, item) => sum + Number(item.total_sales), 0);
    const totalOrders = filteredSales.reduce((sum, item) => sum + Number(item.total_orders), 0);
    const averageOrder = totalOrders ? totalRevenue / totalOrders : 0;
    const topCategory = categorySales[0];

    const exportCsv = async () => {
        try {
            const response = await api.get(`/admin/reports/export.php?days=${periodDays[period]}`, { responseType: 'blob' });
            const blob = response.data;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const disposition = response.headers?.['content-disposition'] || '';
            const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
            link.href = url;
            link.download = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `laporan-penjualan-${period}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal mengekspor laporan. Coba lagi.');
        }
    };

    const lineData = {
        labels: filteredSales.map(item => new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
        datasets: [{
            label: 'Penjualan', data: filteredSales.map(item => Number(item.total_sales)),
            borderColor: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.12)', fill: true,
            tension: 0.35, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#059669', pointBorderColor: '#fff', pointBorderWidth: 2
        }]
    };

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => ` ${formatRupiah(context.parsed.y)}` } } },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', callback: value => formatRupiah(value) } }
        }
    };

    const doughnutData = {
        labels: categorySales.map(item => item.category),
        datasets: [{ data: categorySales.map(item => item.total_sales), backgroundColor: ['#059669', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899', '#0891b2'], borderWidth: 3, borderColor: '#fff' }]
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
    if (error) return <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex flex-col items-center gap-4"><AlertTriangle className="w-10 h-10" /><p className="font-bold">{error}</p><button onClick={() => { setLoading(true); setError(''); fetchReport(); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm">Coba Lagi</button></div>;

    const metrics = [
        ['Omzet periode', formatRupiah(totalRevenue), 'Pendapatan terakumulasi', DollarSign, 'text-emerald-700 bg-emerald-50'],
        ['Transaksi', totalOrders, 'Struk tercatat', ShoppingBag, 'text-blue-700 bg-blue-50'],
        ['Rata-rata struk', formatRupiah(averageOrder), 'Nilai per transaksi', TrendingUp, 'text-violet-700 bg-violet-50'],
        ['Stok menipis', report?.summary?.total_low_stock || 0, 'Produk perlu dicek', AlertTriangle, 'text-amber-700 bg-amber-50']
    ];

    return (
        <div className="space-y-6">
            <header className="bg-slate-950 text-white rounded-3xl p-7 shadow-xl shadow-slate-900/10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                    <div><p className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em]">Performance center</p><h2 className="text-3xl font-black tracking-tight mt-2">Laporan Penjualan</h2><p className="text-slate-300 text-sm mt-2">Baca ritme bisnis, temukan kategori kuat, dan pantau risiko stok.</p></div>
                    <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 text-sm"><CalendarDays className="w-4 h-4 text-emerald-300" /><select value={period} onChange={event => { setLoading(true); setPeriod(event.target.value); }} className="bg-transparent py-2.5 outline-none font-bold text-white"><option className="text-slate-900" value="hari_ini">Hari ini</option><option className="text-slate-900" value="minggu_ini">7 hari terakhir</option><option className="text-slate-900" value="bulan_ini">30 hari terakhir</option><option className="text-slate-900" value="tahun_ini">Tahun ini</option></select></label>
                        <button onClick={() => { setLoading(true); fetchReport(); }} title="Refresh laporan" className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"><RefreshCcw className="w-4 h-4" /></button>
                        <button onClick={exportCsv} title="Export laporan" className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold cursor-pointer"><Download className="w-4 h-4" /> Export</button>
                    </div>
                </div><div className="absolute -right-12 -bottom-24 w-64 h-64 rounded-full border-[35px] border-emerald-600/20" />
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map(([label, value, caption, Icon, color]) => <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><div className="flex justify-between items-start"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="text-2xl font-black text-slate-900 mt-2">{value}</p><p className="text-xs text-slate-500 mt-1">{caption}</p></div><div className={`p-3 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div></div></div>)}</section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><div className="flex justify-between items-start mb-5"><div><h3 className="font-black text-slate-900">Ritme omzet</h3><p className="text-xs text-slate-500 mt-1">Pergerakan penjualan berdasarkan periode terpilih</p></div><BarChart3 className="w-5 h-5 text-emerald-600" /></div><div className="h-72">{filteredSales.length ? <Line data={lineData} options={chartOptions} /> : <div className="h-full flex items-center justify-center text-sm text-slate-400">Belum ada data penjualan.</div>}</div></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><div className="mb-2"><h3 className="font-black text-slate-900">Kontribusi kategori</h3><p className="text-xs text-slate-500 mt-1">Kategori dengan omzet terbesar</p></div><div className="h-64">{categorySales.length ? <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }} /> : <div className="h-full flex items-center justify-center text-sm text-slate-400">Belum ada data kategori.</div>}</div></div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Package className="w-5 h-5" /></div><div><h3 className="font-black text-slate-900">Kategori terkuat</h3><p className="text-xs text-slate-500">Prioritas perhatian pada periode ini</p></div></div><p className="text-3xl font-black text-slate-900">{topCategory?.category || '-'}</p><p className="text-sm text-slate-500 mt-1">{topCategory ? `${formatRupiah(topCategory.total_sales)} kontribusi omzet` : 'Belum ada penjualan'}</p></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><div className="flex items-center gap-3 mb-5"><div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><AlertTriangle className="w-5 h-5" /></div><div><h3 className="font-black text-slate-900">Perlu ditindaklanjuti</h3><p className="text-xs text-slate-500">Stok paling kritis saat ini</p></div></div>{report?.low_stock_products?.slice(0, 3).map(product => <div key={product.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"><span className="text-sm font-bold text-slate-700 truncate pr-3">{product.name}</span><span className="text-xs font-black text-rose-600">{product.stock} tersisa</span></div>)}{!report?.low_stock_products?.length && <p className="text-sm text-slate-400">Semua stok dalam kondisi aman.</p>}</div>
            </section>
        </div>
    );
}
