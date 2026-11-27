// File: src/pages/admin/AdminProductsPage.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import * as XLSX from 'xlsx';
import { Plus, Edit, Trash2, RefreshCcw, AlertTriangle, Search, CheckCircle2, XCircle, Upload, Download, ArrowUpDown, CheckSquare, Square } from 'lucide-react';
import ProductFormModal from '../../components/admin/ProductFormModal';

export default function AdminProductsPage() {
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [toasts, setToasts] = useState([]);
    const [searchParams] = useSearchParams();
    const [selectedIds, setSelectedIds] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [importing, setImporting] = useState(false);
    const searchInputRef = useRef(null);
    const importInputRef = useRef(null);

    const showToast = (type, message) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    const fetchProducts = useCallback(async () => {
        try {
            const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
            const endpoint = isDemo ? '/get.product.php?per_page=100' : '/admin/products.php';
            const response = await api.get(endpoint);
            if (response.data && response.data.status === 'success') {
                setProducts(response.data.data || []);
                setError('');
            } else {
                setError(response.data?.message || "Gagal memuat produk.");
            }
        } catch (err) {
            console.error("Gagal ambil produk:", err);
            setError(err.response?.data?.message || "Terjadi kesalahan saat memuat data produk.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const categoryFromUrl = searchParams.get('category');
        if (categoryFromUrl) setSelectedCategory(categoryFromUrl);
        fetchProducts();
        searchInputRef.current?.focus();
    }, [fetchProducts, searchParams]);

    const categories = useMemo(() => {
        return ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
    }, [products]);

    const visibleProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const filtered = products.filter(p => {
            const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
            const matchSearch = !q
                || (p.name && p.name.toLowerCase().includes(q))
                || (p.barcode && p.barcode.toLowerCase().includes(q));
            return matchCategory && matchSearch;
        });
        return [...filtered].sort((a, b) => {
            const left = sortConfig.key === 'name' || sortConfig.key === 'category'
                ? String(a[sortConfig.key] || '').toLowerCase()
                : Number(a[sortConfig.key] || 0);
            const right = sortConfig.key === 'name' || sortConfig.key === 'category'
                ? String(b[sortConfig.key] || '').toLowerCase()
                : Number(b[sortConfig.key] || 0);
            if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
            if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [products, searchQuery, selectedCategory, sortConfig]);

    const toggleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleSelection = (id) => {
        setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    };

    const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every(p => selectedIds.includes(p.id));
    const toggleSelectAll = () => {
        setSelectedIds(current => allVisibleSelected
            ? current.filter(id => !visibleProducts.some(p => p.id === id))
            : [...new Set([...current, ...visibleProducts.map(p => p.id)])]);
    };

    const exportCsv = () => {
        const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = [
            ['barcode', 'name', 'price', 'category', 'stock', 'is_promo', 'promo'],
            ...visibleProducts.map(p => [p.barcode, p.name, p.price, p.category, p.stock, p.is_promo ? 1 : 0, p.promo || 0])
        ];
        const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `posmart-produk-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const parseCsv = (text) => {
        const rows = [];
        let row = [], cell = '', quoted = false;
        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            if (char === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i += 1; }
            else if (char === '"') quoted = !quoted;
            else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
            else if ((char === '\n' || char === '\r') && !quoted) {
                if (char === '\r' && text[i + 1] === '\n') i += 1;
                row.push(cell.trim());
                if (row.some(Boolean)) rows.push(row);
                row = []; cell = '';
            } else cell += char;
        }
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        return rows;
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
            showToast('error', 'Gunakan file CSV atau Excel dengan kolom: barcode, name, price, category, stock.');
            return;
        }
        setImporting(true);
        try {
            let rows;
            if (/\.(xlsx|xls)$/i.test(file.name)) {
                const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            } else {
                rows = parseCsv(await file.text());
            }
            if (rows.length < 2) throw new Error('File CSV tidak memiliki data produk.');
            const headers = rows[0].map(header => header.toLowerCase());
            const required = ['name', 'price', 'category', 'stock'];
            if (required.some(field => !headers.includes(field))) throw new Error('Kolom wajib: name, price, category, stock.');
            const imported = rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
                .filter(row => row.name && row.price && row.category);
            for (const product of imported) {
                await api.post('/admin/products.php', {
                    barcode: product.barcode,
                    name: product.name,
                    price: Number(product.price.replace(/[^\d]/g, '')),
                    category: product.category,
                    stock: Number(product.stock || 0),
                    is_promo: product.is_promo === '1' || product.is_promo === 'true',
                    promo: Number(product.promo || 0)
                });
            }
            showToast('success', `${imported.length} produk berhasil diimport.`);
            fetchProducts();
        } catch (err) {
            showToast('error', err.message || 'Gagal mengimport CSV.');
        } finally {
            setImporting(false);
        }
    };

    const deleteSelected = async () => {
        if (!selectedIds.length || !window.confirm(`Hapus ${selectedIds.length} produk terpilih?`)) return;
        setDeleting(true);
        try {
            const response = await api.delete('/admin/products.php', { data: { ids: selectedIds } });
            if (response.data?.status !== 'success') throw new Error(response.data?.message || 'Gagal menghapus produk.');
            showToast('success', `${selectedIds.length} produk berhasil dihapus.`);
            setSelectedIds([]);
            fetchProducts();
        } catch (err) {
            showToast('error', err.response?.data?.message || err.message || 'Gagal menghapus produk.');
        } finally {
            setDeleting(false);
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

    const handleSaveSuccess = () => {
        fetchProducts();
        showToast('success', productToEdit ? 'Produk berhasil diperbarui.' : 'Produk baru berhasil ditambahkan.');
    };

    const confirmDeleteProduct = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const response = await api.delete(`/admin/products.php?id=${deleteTarget.id}`);
            if (response.data && response.data.status === 'success') {
                showToast('success', `Produk "${deleteTarget.name}" berhasil dihapus.`);
                setDeleteTarget(null);
                fetchProducts();
            } else {
                showToast('error', response.data?.message || "Gagal menghapus produk.");
            }
        } catch (err) {
            console.error("Gagal hapus produk:", err);
            showToast('error', err.response?.data?.message || "Terjadi kesalahan saat menghapus produk.");
        } finally {
            setDeleting(false);
        }
    };

    const stockBadge = (stock) => {
        if (stock === 0) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Habis (0)
                </span>
            );
        }
        if (stock < 5) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    {stock} pcs
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                {stock} pcs
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-slate-600 font-medium text-sm">Memuat daftar produk...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex flex-col items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-rose-600" />
                <p className="font-bold text-center">{error}</p>
                <button
                    onClick={() => { setLoading(true); setError(''); fetchProducts(); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            {/* Toast Notifications */}
            <div className="fixed top-6 right-6 z-[70] space-y-3">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-fade-in-left ${
                            toast.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                    >
                        {toast.type === 'success'
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-lg">
                    {/* Input Pencarian */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Cari nama produk atau scan barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Dropdown Filter Kategori Cepat */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:bg-white focus:outline-none cursor-pointer"
                    >
                        <option value="All">Semua Kategori</option>
                        {categories.filter(c => c !== 'All').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleImport} className="hidden" />
                    <button onClick={() => importInputRef.current?.click()} disabled={importing} className="flex items-center gap-2 bg-white hover:bg-lime text-ink border-2 border-ink px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60">
                        <Upload className="w-4 h-4" /> {importing ? 'Import...' : 'Import CSV/Excel'}
                    </button>
                    <button onClick={exportCsv} className="flex items-center gap-2 bg-white hover:bg-lime text-ink border-2 border-ink px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={openAddModal} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer">
                        <Plus className="w-4 h-4" /> Tambah Produk
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-500 mb-4 -mt-2">
                Total {visibleProducts.length} produk ditampilkan
                {selectedCategory !== 'All' && ` | Kategori: ${selectedCategory}`}
                {searchQuery && ` | Hasil pencarian: "${searchQuery}"`}
            </p>

            {selectedIds.length > 0 && (
                <div className="mb-4 flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-bold text-rose-800">{selectedIds.length} produk dipilih</span>
                    <button onClick={deleteSelected} disabled={deleting} className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-60">
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                        <tr>
                            <th className="p-4"><button onClick={toggleSelectAll} title="Pilih semua" className="cursor-pointer">{allVisibleSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}</button></th>
                            <th className="p-4">Gambar</th>
                            <th className="p-4">Nama Produk</th>
                            <th className="p-4">Barcode</th>
                            <th className="p-4">Kategori</th>
                            <th className="p-4"><button onClick={() => toggleSort('stock')} className="inline-flex items-center gap-1 cursor-pointer">Stok <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                            <th className="p-4"><button onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 cursor-pointer">Harga <ArrowUpDown className="w-3.5 h-3.5" /></button></th>
                            <th className="p-4">Promo</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                        {visibleProducts.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="p-8 text-center text-slate-400">
                                    Tidak ada produk yang cocok. Silakan tambah produk baru.
                                </td>
                            </tr>
                        ) : (
                            visibleProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4"><button onClick={() => toggleSelection(p.id)} title="Pilih produk" className="cursor-pointer">{selectedIds.includes(p.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}</button></td>
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
                                    <td className="p-4">{stockBadge(p.stock)}</td>
                                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">Rp {Number(p.price).toLocaleString('id-ID')}</td>
                                    <td className="p-4">
                                        {p.is_promo ? (
                                            <span className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold">-{p.promo || 0}%</span>
                                        ) : (
                                            <span className="text-slate-300 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(p)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                                title="Edit Produk"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(p)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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

            {/* Modal Konfirmasi Hapus */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Hapus Produk?</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Apakah Anda yakin ingin menghapus produk <strong>"{deleteTarget.name}"</strong>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDeleteProduct}
                                disabled={deleting}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {deleting && <RefreshCcw className="w-3.5 h-3.5 animate-spin" />}
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <ProductFormModal
                    key={productToEdit?.id ?? 'new'}
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveSuccess}
                    productToEdit={productToEdit}
                />
            )}
        </div>
    );
}