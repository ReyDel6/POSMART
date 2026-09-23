// File: src/pages/admin/AdminSettingsPage.jsx
import { useState, useEffect } from 'react';
import { Settings, Store, Printer, Save, Loader2 } from 'lucide-react';
import api from '../../utils/api';

const DEFAULTS = {
    store_name: 'POSMart Fresh',
    store_phone: '081234567890',
    store_address: 'Jl. Raya Bogor No. 45, Jakarta Timur',
    whatsapp: '',
    receipt_footer: 'Terima kasih telah berbelanja di POSMart! Barang yang sudah dibeli tidak dapat ditukar.',
};

export default function AdminSettingsPage() {
    const [form, setForm] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let ignore = false;
        api.get('/admin/settings.php')
            .then(response => {
                if (ignore) return;
                if (response.data && response.data.status === 'success') {
                    const data = response.data.data || {};
                    setForm({ ...DEFAULTS, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== '')) });
                } else {
                    setError(response.data?.message || 'Gagal memuat pengaturan.');
                }
            })
            .catch(err => {
                if (ignore) return;
                console.error('Gagal memuat pengaturan:', err);
                setError('Gagal terhubung ke server.');
            })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, []);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setNotice('');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const response = await api.put('/admin/settings.php', form);
            if (response.data && response.data.status === 'success') {
                setNotice(response.data.message || 'Pengaturan berhasil disimpan.');
            } else {
                setError(response.data?.message || 'Gagal menyimpan pengaturan.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal terhubung ke server.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-emerald-600" /> Pengaturan Toko & Struk
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Konfigurasi informasi umum toko dan cetakan struk pembayaran</p>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-semibold">
                    ⚠️ {error}
                </div>
            )}
            {notice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm font-semibold">
                    ✓ {notice}
                </div>
            )}

            <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Store className="w-5 h-5 text-emerald-600" /> Informasi Toko
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Toko / Minimarket</label>
                            <input type="text" name="store_name" value={form.store_name} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nomor Telepon Toko</label>
                            <input type="text" name="store_phone" value={form.store_phone} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Alamat Lengkap Toko</label>
                        <input type="text" name="store_address" value={form.store_address} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nomor WhatsApp Toko (format: 628xxxxxxxxxx)</label>
                        <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="628123456789" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <p className="text-[11px] text-slate-400 mt-1">Dipakai untuk menerima notifikasi pesanan baru via WhatsApp. Kosongkan untuk memakai nomor pelanggan.</p>
                    </div>
                </div>

                <div className="space-y-4 pb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-emerald-600" /> Cetakan Struk Kasir
                    </h3>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pesan Footer Struk</label>
                        <textarea name="receipt_footer" value={form.receipt_footer} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none" />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-md">
                        <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                </div>
            </form>
        </div>
    );
}