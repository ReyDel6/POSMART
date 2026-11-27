// File: src/pages/admin/AdminSettingsPage.jsx
import { useState, useEffect } from 'react';
import { Settings, Store, Printer, Save, Loader2, Mail, Coins, QrCode, Wallet, Landmark, Upload } from 'lucide-react';
import api from '../../utils/api';

const DEFAULTS = {
    store_name: 'POSMart Fresh',
    store_phone: '081234567890',
    store_address: 'Jl. Raya Bogor No. 45, Jakarta Timur',
    store_logo: '',
    whatsapp: '',
    store_email: '',
    receipt_footer: 'Terima kasih telah berbelanja di POSMart! Barang yang sudah dibeli tidak dapat ditukar.',
    receipt_paper_width: '80',
    tax_mode: 'inclusive',
    tax_rate: '11',
    point_earning_rate: '1',
    point_redeem_rate: '50',
    payment_methods: 'qris,gopay,shopeepay,ovo,dana,bank_transfer',
};

const PAYMENT_OPTIONS = [
    { code: 'qris', label: 'QRIS', icon: QrCode },
    { code: 'gopay', label: 'GoPay', icon: Wallet },
    { code: 'shopeepay', label: 'ShopeePay', icon: Wallet },
    { code: 'ovo', label: 'OVO', icon: Wallet },
    { code: 'dana', label: 'DANA', icon: Wallet },
    { code: 'bank_transfer', label: 'Transfer (VA)', icon: Landmark },
    { code: 'echannel', label: 'Mandiri e-Channel', icon: Landmark },
    { code: 'bca_va', label: 'BCA VA', icon: Landmark },
    { code: 'bni_va', label: 'BNI VA', icon: Landmark },
    { code: 'bri_va', label: 'BRI VA', icon: Landmark },
    { code: 'permata_va', label: 'Permata VA', icon: Landmark },
];

export default function AdminSettingsPage() {
    const [form, setForm] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);

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

    const handlePaymentToggle = (code) => {
        setForm(prev => {
            const current = String(prev.payment_methods || '')
                .split(',').map(s => s.trim()).filter(Boolean);
            const next = current.includes(code)
                ? current.filter(c => c !== code)
                : [...current, code];
            return { ...prev, payment_methods: next.join(',') };
        });
        setNotice('');
    };

    const normalizeWhatsapp = (value) => {
        const digits = String(value || '').replace(/\D/g, '');
        return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const body = new FormData();
        body.append('logo', file);
        setUploadingLogo(true);
        try {
            const response = await api.post('/admin/upload_store_logo.php', body, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (response.data?.status === 'success') setForm(prev => ({ ...prev, store_logo: response.data.image_url }));
            else setError(response.data?.message || 'Gagal mengunggah logo.');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mengunggah logo.');
        } finally { setUploadingLogo(false); event.target.value = ''; }
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
                <div className="md:col-span-2">
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
                    <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        {form.store_logo ? <img src={form.store_logo} alt="Logo toko" className="w-16 h-16 object-contain rounded-lg bg-white border border-slate-200" /> : <div className="w-16 h-16 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400"><Store className="w-7 h-7" /></div>}
                        <div><p className="text-sm font-bold text-slate-700">Logo Toko</p><p className="text-[11px] text-slate-500 mb-2">JPG/PNG/WEBP maksimal 2MB, rasio 1:1 disarankan.</p><label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"><Upload className="w-3.5 h-3.5" /> {uploadingLogo ? 'Mengunggah...' : 'Unggah Logo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} /></label></div>
                    </div>
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
                        <textarea rows="2" name="store_address" value={form.store_address} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nomor WhatsApp Toko (format: 628xxxxxxxxxx)</label>
                        <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange} onBlur={() => setForm(prev => ({ ...prev, whatsapp: normalizeWhatsapp(prev.whatsapp) }))} placeholder="08123456789" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <p className="text-[11px] text-slate-500 mt-1">Awalan 08 akan otomatis diubah ke format 62 untuk notifikasi WhatsApp.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email Notifikasi Toko
                        </label>
                        <input type="email" name="store_email" value={form.store_email} onChange={handleChange} placeholder="tokoposmart@email.com" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <p className="text-[11px] text-slate-500 mt-1">Email penerima notifikasi pesanan dan pembayaran.</p>
                    </div>
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
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ukuran Kertas Printer</label>
                        <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="radio" name="receipt_paper_width" value="58" checked={form.receipt_paper_width === '58'} onChange={handleChange} /> 58mm</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="receipt_paper_width" value="80" checked={form.receipt_paper_width === '80'} onChange={handleChange} /> 80mm</label></div>
                    </div>
                </div>

                <div className="space-y-4 pb-4">
                    <h3 className="text-base font-bold text-slate-800">Pajak Penjualan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mode Harga</label><select name="tax_mode" value={form.tax_mode} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"><option value="inclusive">Harga sudah termasuk pajak</option><option value="exclusive">Pajak ditambahkan saat checkout</option></select></div><div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tarif Pajak (%)</label><input type="number" min="0" max="100" step="0.01" name="tax_rate" value={form.tax_rate} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm" /></div></div>
                    <p className="text-[11px] text-slate-500">PPN ditambahkan otomatis hanya jika harga belum termasuk pajak.</p>
                </div>

                <div className="space-y-4 pb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-500" /> Program Poin Member
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Poin per Rp 1.000 Belanja</label>
                            <input type="number" min="0" name="point_earning_rate" value={form.point_earning_rate} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            <p className="text-[11px] text-slate-400 mt-1">Contoh: isi 1 berarti belanja Rp 1.000 mendapat 1 poin (hanya untuk pembayaran lunas).</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nilai 1 Poin (Rp)</label>
                            <input type="number" min="0" name="point_redeem_rate" value={form.point_redeem_rate} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            <p className="text-[11px] text-slate-400 mt-1">Potongan rupiah per poin saat pelanggan menukar poin di checkout.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-600" /> Metode Pembayaran Online
                    </h3>
                    <p className="text-xs text-slate-500">Aktifkan/nonaktifkan metode yang tampil di checkout pelanggan (perlu konfigurasi Midtrans).</p>
                    <div className="flex flex-wrap gap-2">
                        {PAYMENT_OPTIONS.map(opt => {
                            const active = String(form.payment_methods || '').split(',').map(s => s.trim()).filter(Boolean).includes(opt.code);
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.code}
                                    type="button"
                                    onClick={() => handlePaymentToggle(opt.code)}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${active
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-slate-400">Pilih minimal satu. QRIS tampil sebagai kode QR langsung di aplikasi; sisanya lewat halaman pembayaran Midtrans.</p>
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