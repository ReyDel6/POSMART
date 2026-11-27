import { useCallback, useEffect, useState } from 'react';
import { Tags, ArrowRight, Package, Plus, Pencil, Trash2, Search, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const EMPTY_FORM = { name: '', icon: '🏷️', is_active: true };

export default function AdminCategoriesPage() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [fetchLoading, setFetchLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [toasts, setToasts] = useState([]);

    const showToast = (type, message) => {
        const id = Date.now();
        setToasts(current => [...current, { id, type, message }]);
        setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 3500);
    };

    const fetchCategories = useCallback(async () => {
        try {
            const response = await api.get('/admin/categories.php');
            if (response.data?.status === 'success') setCategories(response.data.data || []);
            else setError(response.data?.message || 'Gagal memuat kategori.');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal terhubung ke server.');
        } finally {
            setFetchLoading(false);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const visibleCategories = categories.filter(category =>
        category.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (category) => {
        setEditing(category);
        setForm({ name: category.name, icon: category.icon || '🏷️', is_active: Boolean(category.is_active) });
        setModalOpen(true);
    };

    const saveCategory = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const response = editing
                ? await api.put(`/admin/categories.php/${editing.id}`, form)
                : await api.post('/admin/categories.php', form);
            if (response.data?.status !== 'success') throw new Error(response.data?.message || 'Gagal menyimpan kategori.');
            showToast('success', editing ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
            setModalOpen(false);
            fetchCategories();
        } catch (err) {
            showToast('error', err.response?.data?.message || err.message || 'Gagal menyimpan kategori.');
        } finally {
            setSaving(false);
        }
    };

    const deleteCategory = async (category) => {
        if (category.count > 0) {
            showToast('error', 'Kategori masih digunakan produk dan tidak dapat dihapus.');
            return;
        }
        if (!window.confirm(`Hapus kategori "${category.name}"?`)) return;
        try {
            const response = await api.delete(`/admin/categories.php/${category.id}`);
            if (response.data?.status !== 'success') throw new Error(response.data?.message || 'Gagal menghapus kategori.');
            showToast('success', 'Kategori berhasil dihapus.');
            fetchCategories();
        } catch (err) {
            showToast('error', err.response?.data?.message || err.message || 'Gagal menghapus kategori.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Tags className="w-6 h-6 text-emerald-600" /> Kategori Produk</h2>
                    <p className="text-xs text-slate-500 mt-1">Kelola nama, ikon, dan status kategori secara mandiri.</p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">
                    <Plus className="w-4 h-4" /> Tambah Kategori
                </button>
            </div>

            <div className="fixed top-6 right-6 z-[70] space-y-3">
                {toasts.map(toast => <div key={toast.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}{toast.message}
                </div>)}
            </div>

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-semibold">⚠️ {error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" /> Ringkasan</h3>
                    <p className="text-sm text-slate-500">Total kategori</p>
                    <p className="text-4xl font-black text-emerald-600 mt-2">{categories.length}</p>
                    <p className="text-xs text-slate-400 mt-3">Kategori aktif dan nonaktif tetap bisa dikelola dari tabel.</p>
                </div>

                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div><h3 className="text-base font-bold text-slate-800">Daftar Kategori</h3><p className="text-xs text-slate-500 mt-1">Klik nama kategori untuk memfilter produk.</p></div>
                        <div className="relative w-full sm:w-56"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari kategori..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" /></div>
                    </div>
                    {fetchLoading ? <div className="text-center py-8 text-slate-400">Memuat kategori...</div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200"><tr><th className="p-4">Kategori</th><th className="p-4">Status</th><th className="p-4">Jumlah Produk</th><th className="p-4 text-right">Aksi</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                    {visibleCategories.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-slate-400">Belum ada kategori.</td></tr> : visibleCategories.map(category => (
                                        <tr key={category.id} className="hover:bg-emerald-50/40 transition-colors">
                                            <td className="p-4"><button onClick={() => navigate(`/admin/products?category=${encodeURIComponent(category.name)}`)} className="inline-flex items-center gap-2 font-bold text-slate-900 hover:text-emerald-700"><span className="text-xl">{category.icon || '🏷️'}</span>{category.name}<ArrowRight className="w-4 h-4 text-emerald-500" /></button></td>
                                            <td className="p-4"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${category.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{category.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                                            <td className="p-4"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">{category.count} Produk</span></td>
                                            <td className="p-4"><div className="flex justify-end gap-1"><button onClick={() => openEdit(category)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl" title="Edit"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteCategory(category)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-40" disabled={category.count > 0} title={category.count > 0 ? 'Masih digunakan produk' : 'Hapus'}><Trash2 className="w-4 h-4" /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {modalOpen && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={saveCategory} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border-2 border-ink">
                <h3 className="text-lg font-black text-slate-900">{editing ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
                <label className="block mt-5 text-xs font-bold text-slate-600">Nama Kategori<input required maxLength={50} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="Contoh: Beverage" /></label>
                <label className="block mt-4 text-xs font-bold text-slate-600">Ikon / Emoji<input maxLength={10} value={form.icon} onChange={event => setForm({ ...form, icon: event.target.value })} className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="☕" /></label>
                <label className="flex items-center gap-2 mt-4 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Kategori aktif</label>
                <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Batal</button><button disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
            </form></div>}
        </div>
    );
}
