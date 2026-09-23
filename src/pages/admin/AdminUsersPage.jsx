// File: src/pages/admin/AdminUsersPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, ShieldCheck, UserCheck, Mail, Pencil, Trash2, X, RefreshCcw } from 'lucide-react';
import api from '../../utils/api';
import useDialog from '../../hooks/useDialog';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', role: 'cashier', password: '' };
const ROLE_LABELS = { owner: 'Pemilik', admin: 'Admin', cashier: 'Kasir', user: 'Pelanggan' };
const ROLE_STYLE = {
    owner: 'bg-violet-100 text-violet-700',
    admin: 'bg-blue-100 text-blue-700',
    cashier: 'bg-emerald-100 text-emerald-700',
    user: 'bg-slate-100 text-slate-600',
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useDialog(modalOpen, () => setModalOpen(false));

    const fetchUsers = useCallback(async () => {
        try {
            const response = await api.get('/admin/users.php');
            if (response.data && response.data.status === 'success') {
                setUsers(response.data.data);
            } else {
                setError(response.data?.message || 'Gagal memuat daftar staf.');
            }
        } catch (err) {
            console.error('Gagal memuat daftar staf:', err);
            setError('Gagal terhubung ke server.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let ignore = false;
        api.get('/admin/users.php')
            .then(response => {
                if (ignore) return;
                if (response.data && response.data.status === 'success') {
                    setUsers(response.data.data);
                } else {
                    setError(response.data?.message || 'Gagal memuat daftar staf.');
                }
            })
            .catch(err => {
                if (ignore) return;
                console.error('Gagal memuat daftar staf:', err);
                setError('Gagal terhubung ke server.');
            })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, []);

    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (u) => {
        setEditing(u);
        setForm({ name: u.name, email: u.email, phone: u.phone || '', address: u.address || '', role: u.role, password: '' });
        setModalOpen(true);
    };

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = editing
                ? await api.put('/admin/users.php', { ...form, id: editing.id })
                : await api.post('/admin/users.php', form);
            if (response.data && response.data.status === 'success') {
                setModalOpen(false);
                fetchUsers();
            } else {
                setError(response.data?.message || 'Gagal menyimpan data staf.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal terhubung ke server.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (u) => {
        if (!window.confirm(`Hapus staf "${u.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
        setDeletingId(u.id);
        setError('');
        try {
            const response = await api.delete(`/admin/users.php?id=${u.id}`);
            if (response.data && response.data.status === 'success') {
                setUsers(prev => prev.filter(x => x.id !== u.id));
            } else {
                alert(response.data?.message || 'Gagal menghapus staf.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal menghapus staf.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-emerald-600" /> Kelola Pengguna & Kasir
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Daftar staf, kasir, dan administrator akses POSMart</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    <UserPlus className="w-4 h-4" /> Tambah Staf Baru
                </button>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-semibold">
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin" />
                        <p className="text-slate-600 font-medium text-sm">Memuat daftar staf...</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                            <tr>
                                <th className="p-4">Nama Staf</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Telepon</th>
                                <th className="p-4">Hak Akses (Role)</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400">Belum ada staf terdaftar.</td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full text-white font-bold flex items-center justify-center text-xs ${u.role === 'admin' ? 'bg-blue-500' : u.role === 'owner' ? 'bg-violet-500' : 'bg-slate-400'}`}>
                                                {(u.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            {u.name}
                                        </td>
                                        <td className="p-4 text-slate-600 flex items-center gap-1.5 pt-6">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {u.email}
                                        </td>
                                        <td className="p-4 font-mono text-xs text-slate-500">{u.phone || '-'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${ROLE_STYLE[u.role] || ROLE_STYLE.user}`}>
                                                {u.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : u.role === 'owner' ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                {(ROLE_LABELS[u.role] || u.role).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    title="Ubah data staf"
                                                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u)}
                                                    disabled={deletingId === u.id || u.role === 'owner'}
                                                    title={u.role === 'owner' ? 'Akun pemilik tidak dapat dihapus' : 'Hapus staf'}
                                                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
                            <h3 className="text-base font-black text-slate-800">
                                {editing ? 'Ubah Data Staf' : 'Tambah Staf Baru'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Lengkap *</label>
                                <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email *</label>
                                <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telepon</label>
                                    <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hak Akses *</label>
                                    <select name="role" value={form.role} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                                        <option value="owner">Pemilik Toko (Owner)</option>
                                        <option value="admin">Admin</option>
                                        <option value="cashier">Kasir</option>
                                        <option value="user">Pelanggan</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Alamat</label>
                                <input name="address" value={form.address} onChange={handleChange} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    Password {editing ? '(kosongkan jika tidak diubah)' : '*'}
                                </label>
                                <input name="password" type="password" value={form.password} onChange={handleChange} required={!editing} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-md">
                                    {saving ? 'Menyimpan...' : 'Simpan Staf'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}