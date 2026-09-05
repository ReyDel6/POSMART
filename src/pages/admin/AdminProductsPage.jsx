// File: src/pages/admin/AdminProductsPage.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { Plus, Edit, Trash2, RefreshCcw, AlertTriangle } from 'lucide-react';
import ProductFormModal from '../../components/admin/ProductFormModal';

export default function AdminProductsPage() {
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/admin/products.php');
            if (response.data && response.data.status === 'success') {
                setProducts(response.data.data || []); // Pastikan selalu array
            } else {
                setError(response.data?.message || "Gagal memuat produk.");
            }
        } catch (err) {
            console.error("Gagal ambil produk:", err);
            setError(err.response?.data?.message || "Terjadi kesalahan saat memuat data produk.");
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setProductToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (product) => {
        setProductToEdit(product);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setProductToEdit(null);
    };

    const categoryFilter = searchParams.get('category') || '';
    const visibleProducts = categoryFilter
        ? products.filter(product => product.category === categoryFilter)
        : products;

    const handleDeleteProduct = async (product) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`)) {
            return;
        }

        try {
            const response = await api.delete(`/admin/products.php?id=${product.id}`);
            if (response.data && response.data.status === 'success') {
                fetchProducts();
            } else {
                alert(response.data?.message || "Gagal menghapus produk.");
            }
        } catch (err) {
            console.error("Gagal hapus produk:", err);
            alert(err.response?.data?.message || "Terjadi kesalahan saat menghapus produk.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCcw className="w-8 h-8 text-red-600 animate-spin" />
                    <p className="text-slate-600 font-medium text-sm">Memuat daftar produk...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex flex-col items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-red-600" />
                <p className="font-bold text-center">{error}</p>
                <button
                    onClick={fetchProducts}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors shadow"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Kelola Produk</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {categoryFilter ? `Kategori: ${categoryFilter} | ` : ''}Total {visibleProducts.length} produk ditampilkan
                    </p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Tambah Produk
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                        <tr>
                            <th className="p-4">Gambar</th>
                            <th className="p-4">Nama Produk</th>
                            <th className="p-4">Barcode</th>
                            <th className="p-4">Kategori</th>
                            <th className="p-4">Stok</th>
                            <th className="p-4">Harga</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                        {visibleProducts.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-400">
                                    Belum ada produk. Silakan tambah produk baru.
                                </td>
                            </tr>
                        ) : (
                            visibleProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                            {p.image ? (
                                                <img 
                                                    src={p.image.startsWith('http') || p.image.startsWith('/') ? p.image : `/product/${p.image}`} 
                                                    alt={p.name} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=No+Image'; }}
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-400 font-bold">No Img</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-900">{p.name}</td>
                                    <td className="p-4 font-mono text-xs text-slate-500">{p.barcode || '-'}</td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                                            {p.category}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`font-bold ${p.stock === 0 ? 'text-red-600' : p.stock < 10 ? 'text-amber-600' : 'text-slate-800'}`}>
                                            {p.stock}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-900">Rp {Number(p.price).toLocaleString('id-ID')}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <button 
                                                onClick={() => openEditModal(p)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                title="Edit Produk"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteProduct(p)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                title="Hapus Produk"
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

            <ProductFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={fetchProducts}
                productToEdit={productToEdit}
            />
        </div>
    );
}
