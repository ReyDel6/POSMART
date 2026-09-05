// File: src/pages/admin/AdminCategoriesPage.jsx
import { useState, useEffect } from 'react';
import { Tags, ArrowRight, Package } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

export default function AdminCategoriesPage() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState('');
    const [fetchLoading, setFetchLoading] = useState(true);

    // Fetch categories dari backend
    const fetchCategories = async () => {
        setFetchLoading(true);
        try {
            const response = await api.get('/admin/categories.php');
            if (response.data && response.data.status === 'success') {
                setCategories(response.data.data);
            } else {
                setError(response.data?.message || 'Gagal memuat kategori');
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Gagal terhubung ke server');
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Tags className="w-6 h-6 text-red-600" /> Kategori Produk
                    </h2>
                            <p className="text-xs text-slate-500 mt-1">Ringkasan kategori berdasarkan produk yang terdaftar</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-semibold">
                    ⚠️ {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-red-600" /> Ringkasan
                    </h3>
                    <p className="text-sm text-slate-500">Total kategori aktif</p>
                    <p className="text-4xl font-black text-red-600 mt-2">{categories.length}</p>
                    <p className="text-xs text-slate-400 mt-3">Kategori baru dibuat saat menambahkan produk.</p>
                </div>

                {/* Tabel Kategori */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-1">Distribusi Produk per Kategori</h3>
                    <p className="text-xs text-slate-500 mb-4">Klik nama kategori untuk melihat produknya.</p>
                    {fetchLoading ? (
                        <div className="text-center py-8 text-slate-400">
                            <div className="inline-block w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm mt-2">Memuat kategori...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Nama Kategori</th>
                                        <th className="p-4">Deskripsi</th>
                                        <th className="p-4">Jumlah Produk</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                    {categories.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="p-4 text-center text-slate-400">
                                                Belum ada kategori karena belum ada produk.
                                            </td>
                                        </tr>
                                    ) : (
                                        categories.map(c => (
                                            <tr
                                                key={c.id}
                                                onClick={() => navigate(`/admin/products?category=${encodeURIComponent(c.name)}`)}
                                                className="hover:bg-red-50/40 transition-colors cursor-pointer"
                                                title={`Lihat produk kategori ${c.name}`}
                                            >
                                                <td className="p-4 font-bold text-slate-900">
                                                    <span className="inline-flex items-center gap-2">{c.name}<ArrowRight className="w-4 h-4 text-red-500" /></span>
                                                </td>
                                                <td className="p-4 text-xs text-slate-500">Dari data produk</td>
                                                <td className="p-4">
                                                    <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                                                        {c.count} Produk
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
