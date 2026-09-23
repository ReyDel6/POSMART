import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, RefreshCcw, AppWindow, Gift, Layers, Percent, Save, X, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import useDialog from '../../hooks/useDialog';

const TYPES = [
    { key: 'block', label: 'Diskon Blok', icon: Layers, hint: 'Beli banyak, harga lebih murah (berjenjang)' },
    { key: 'b1g1', label: 'B1G1', icon: Gift, hint: 'Beli X gratis Y' },
    { key: 'bundle', label: 'Paket (Bundle)', icon: AppWindow, hint: 'Gabungan produk dengan harga khusus' },
];

export default function AdminPromosPage() {
    const [promos, setPromos] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editPromo, setEditPromo] = useState(null);

    useDialog(modalOpen, () => { setModalOpen(false); setEditPromo(null); });

    const fetchPromos = useCallback(() => {
        setLoading(true);
        api.get('/admin/promos.php')
            .then(res => setPromos(res.data?.status === 'success' ? res.data.data : []))
            .catch(() => setError('Gagal memuat promo.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchPromos();
        api.get('/admin/products.php')
            .then(res => setProducts(res.data?.status === 'success' ? res.data.data : []))
            .catch(() => {});
    }, [fetchPromos]);

    const toast = (msg, isError = false) => {
        if (isError) setError(msg); else setNotice(msg);
        setTimeout(() => { setError(''); setNotice(''); }, 3500);
    };

    const toggleActive = (p) => {
        api.put('/admin/promos.php', { ...p, active: !p.active })
            .then(res => {
                if (res.data?.status === 'success') { toast('Status promo diperbarui'); fetchPromos(); }
                else toast(res.data?.message || 'Gagal memperbarui', true);
            })
            .catch(() => toast('Gagal memperbarui', true));
    };

    const openModal = (p = null) => { setEditPromo(p); setModalOpen(true); };

    const remove = (id) => {
        if (!window.confirm('Hapus promo ini?')) return;
        api.delete(`/admin/promos.php?id=${id}`)
            .then(res => { toast(res.data?.message || 'Promo dihapus'); fetchPromos(); })
            .catch(() => toast('Gagal menghapus', true));
    };

    const typeInfo = (key) => TYPES.find(t => t.key === key);

    return (
        <div className="space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold">⚠️ {error}</div>}
            {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">✔ {notice}</div>}

            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-800">Kelola Promo (Diskon Blok / B1G1 / Bundle)</h3>
                    <p className="text-xs text-slate-500">Promo aktif otomatis diterapkan di keranjang & checkout (server-side).</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchPromos} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors" title="Muat ulang">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => openModal()} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm cursor-pointer">
                        <Plus className="w-4 h-4" /> Buat Promo
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 text-sm">Memuat promo...</div>
                ) : promos.length === 0 ? (
                    <div className="p-12 text-center">
                        <Percent className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm font-semibold">Belum ada promo. Klik "Buat Promo" untuk memulai.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {promos.map(p => {
                            const t = typeInfo(p.type);
                            const Icon = t?.icon || Percent;
                            return (
                                <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/70 transition-colors">
                                    <div className={`p-2.5 rounded-xl ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 text-sm truncate">{p.name}</h4>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">{t?.label || p.type}</span>
                                            {!p.active && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold">Nonaktif</span>}
                                        </div>
                                        {p.type === 'block' && (
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                {p.product_name} · {(p.tiers || []).map(x => `beli ${x.min_qty}+ = ${x.percent}%`).join(' · ')}
                                            </p>
                                        )}
                                        {p.type === 'b1g1' && (
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{p.product_name} · Beli {p.buy_qty} Gratis {p.free_qty}</p>
                                        )}
                                        {p.type === 'bundle' && (
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">Harga paket Rp {Number(p.bundle_price).toLocaleString('id-ID')}</p>
                                        )}
                                    </div>
                                    <button onClick={() => toggleActive(p)} className="p-2 text-slate-500 hover:text-emerald-600 cursor-pointer" title={p.active ? 'Nonaktifkan' : 'Aktifkan'}>
                                        {p.active ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6" />}
                                    </button>
                                    <button onClick={() => openModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer" title="Edit">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => remove(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer" title="Hapus">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {modalOpen && (
                <PromoFormModal
                    promos={promos}
                    editPromo={editPromo}
                    products={products}
                    saving={saving}
                    onClose={() => { setModalOpen(false); setEditPromo(null); }}
                    onSaved={(msg) => { toast(msg); fetchPromos(); setModalOpen(false); setEditPromo(null); }}
                    setSaving={setSaving}
                />
            )}
        </div>
    );
}

function PromoFormModal({ editPromo, products, saving, onClose, onSaved, setSaving }) {
    const [form, setForm] = useState(() => editPromo ? { ...editPromo, tiers: editPromo.tiers || [], items: editPromo.items || [] } : {
        name: '', type: 'block', product_id: '', active: true,
        buy_qty: 2, free_qty: 1,
        tiers: [{ min_qty: 2, percent: 10 }],
        items: [],
        bundle_price: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!editPromo) {
            setForm(f => {
                const q = { ...f, product_id: products[0]?.id || '' };
                return f.product_id === '' ? q : f;
            });
        }
    }, [products, editPromo]);

    const set = (patch) => setForm(f => ({ ...f, ...patch }));

    const productName = (id) => {
        const p = products.find(x => Number(x.id) === Number(id));
        return p ? `${p.name} — Rp ${Number(p.price).toLocaleString('id-ID')}` : 'Pilih produk...';
    };

    const updateTier = (i, patch) => setForm(f => ({ ...f, tiers: f.tiers.map((t, j) => j === i ? { ...t, ...patch } : t) }));
    const updateItem = (i, patch) => setForm(f => ({ ...f, items: f.items.map((t, j) => j === i ? { ...t, ...patch } : t) }));

    const submit = async () => {
        setSaving(true);
        setError('');
        try {
            const body = { ...form };
            const res = await api.put('/admin/promos.php', body).catch(err => {
                if (err.response?.status >= 400 && err.response?.status < 500) throw { data: err.response.data };
                throw err;
            });
            if (!editPromo) {
                const created = await api.post('/admin/promos.php', body).catch(err => {
                    if (err.response?.status >= 400 && err.response?.status < 500) throw { data: err.response.data };
                    throw err;
                });
                if (created.data?.status === 'success') { onSaved(created.data.message); return; }
                throw { data: created.data };
            }
            if (res.data?.status === 'success') { onSaved(res.data.message); return; }
            throw { data: res.data };
        } catch (err) {
            setError(err.data?.message || 'Terjadi kesalahan saat menyimpan promo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-900">{editPromo ? 'Edit Promo' : 'Buat Promo Baru'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold">⚠️ {error}</div>}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nama Promo</label>
                        <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="cth: Beli 3 Hemat 15%" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tipe Promo</label>
                        <div className="grid grid-cols-3 gap-2">
                            {TYPES.map(t => {
                                const Icon = t.icon;
                                return (
                                    <button key={t.key} type="button" onClick={() => set({ type: t.key })} className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${form.type === t.key ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300'}`}>
                                        <Icon className="w-5 h-5 mb-1" />
                                        <p className="text-xs font-bold">{t.label}</p>
                                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{t.hint}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {(form.type === 'block' || form.type === 'b1g1') && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Produk</label>
                            <select value={form.product_id} onChange={e => set({ product_id: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer">
                                <option value="">Pilih produk...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{productName(p.id)}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {form.type === 'b1g1' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Beli (qty)</label>
                                <input type="number" min="1" value={form.buy_qty} onChange={e => set({ buy_qty: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Gratis (qty)</label>
                                <input type="number" min="1" value={form.free_qty} onChange={e => set({ free_qty: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <p className="text-[11px] text-slate-400 col-span-2">Contoh "Beli 2 Gratis 1": isi Beli=2, Gratis=1 → setiap 3 item, 1 gratis (efektif -33%).</p>
                        </div>
                    )}

                    {form.type === 'block' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Jenjang Diskon</label>
                                <button type="button" onClick={() => set({ tiers: [...form.tiers, { min_qty: Math.max(...form.tiers.map(x => Number(x.min_qty) || 0), 0) + 1, percent: 10 }] })} className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">+ Tambah Jenjang</button>
                            </div>
                            {form.tiers.map((t, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input type="number" min="1" value={t.min_qty} onChange={e => updateTier(i, { min_qty: e.target.value })} className="w-24 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Min qty" />
                                    <span className="text-xs text-slate-400">beli {t.min_qty}+ → diskon</span>
                                    <input type="number" min="1" max="90" value={t.percent} onChange={e => updateTier(i, { percent: e.target.value })} className="w-20 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="%" />
                                    <span className="text-xs text-slate-400">%</span>
                                    {form.tiers.length > 1 && (
                                        <button type="button" onClick={() => set({ tiers: form.tiers.filter((_, j) => j !== i) })} className="ml-auto p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {form.type === 'bundle' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Isi Paket</label>
                                    <button type="button" onClick={() => set({ items: [...form.items, { product_id: '', qty: 1 }] })} className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">+ Tambah Item</button>
                                </div>
                                {form.items.length === 0 && <p className="text-xs text-slate-400">Belum ada item — tambah minimal satu produk ke dalam paket.</p>}
                                {form.items.map((it, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <select value={it.product_id} onChange={e => updateItem(i, { product_id: e.target.value })} className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer">
                                            <option value="">Pilih produk...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <input type="number" min="1" value={it.qty} onChange={e => updateItem(i, { qty: e.target.value })} className="w-16 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Qty" />
                                        <button type="button" onClick={() => set({ items: form.items.filter((_, j) => j !== i) })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Harga Paket (Rp)</label>
                                <input type="number" min="1" value={form.bundle_price} onChange={e => set({ bundle_price: e.target.value })} placeholder="cth: 45000" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                <p className="text-[11px] text-slate-400 mt-1">Dibawah harga normal isi paket agar hemat (selisihnya otomatis jadi diskon).</p>
                            </div>
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={!!form.active} onChange={e => set({ active: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        Promo aktif (langsung diterapkan)
                    </label>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Batal</button>
                    <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 cursor-pointer">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {editPromo ? 'Simpan Perubahan' : 'Buat Promo'}
                    </button>
                </div>
            </div>
        </div>
    );
}