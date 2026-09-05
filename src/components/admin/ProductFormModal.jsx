// File: src/components/admin/ProductFormModal.jsx
import { useState, useEffect, useRef } from 'react';
import { X, Save, ScanBarcode, Upload, Loader2, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

export default function ProductFormModal({ isOpen, onClose, onSave, productToEdit }) {
    const [formData, setFormData] = useState({
        barcode: '',
        name: '',
        price: '',
        category: '',
        stock: '',
        image: ''
    });
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const fileInputRef = useRef(null);

    const generateBarcode = () => `POS${Date.now().toString().slice(-10)}${Math.floor(100 + Math.random() * 900)}`;

    useEffect(() => {
        if (isOpen && productToEdit) {
            const img = productToEdit.image || '';
            setFormData({
                barcode: productToEdit.barcode || '',
                name: productToEdit.name || '',
                price: productToEdit.price || '',
                category: productToEdit.category || '',
                stock: productToEdit.stock || '',
                image: img,
            });
            setPreviewUrl(img ? (img.startsWith('http') ? img : `/product/${img}`) : '');
        } else if (isOpen) {
            setFormData({
                barcode: generateBarcode(),
                name: '',
                price: '',
                category: '',
                stock: '',
                image: '',
            });
            setPreviewUrl('');
        }
    }, [isOpen, productToEdit]);

    useEffect(() => {
        if (!isOpen) return;

        api.get('/get.product.php?categories=1')
            .then((response) => {
                const categories = response.data?.status === 'success' ? response.data.data : [];
                const currentCategory = productToEdit?.category;
                setCategoryOptions(currentCategory && !categories.includes(currentCategory)
                    ? [...categories, currentCategory]
                    : categories
                );
                setIsCustomCategory(false);
            })
            .catch(() => setCategoryOptions([]));
    }, [isOpen, productToEdit]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'image') {
            setPreviewUrl(value ? (value.startsWith('http') ? value : `/product/${value}`) : '');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview lokal instan
        const localPreview = URL.createObjectURL(file);
        setPreviewUrl(localPreview);

        const data = new FormData();
        data.append('image', file);

        setUploading(true);
        setError('');

        try {
            const response = await api.post('/admin/upload_product_image.php', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data && response.data.status === 'success') {
                const uploadedFileName = response.data.image_name;
                setFormData(prev => ({ ...prev, image: uploadedFileName }));
                setPreviewUrl(`/product/${uploadedFileName}`);
            } else {
                setError(response.data?.message || "Gagal mengunggah gambar.");
            }
        } catch (err) {
            console.error("Gagal upload gambar:", err);
            setError(err.response?.data?.message || "Terjadi kesalahan saat mengunggah file gambar.");
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateBarcode = () => {
        setFormData(prev => ({ ...prev, barcode: generateBarcode() }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;
            if (productToEdit) {
                // Logika UPDATE
                response = await api.put('/admin/products.php', { ...formData, id: productToEdit.id });
            } else {
                // Logika ADD
                response = await api.post('/admin/products.php', formData);
            }
            
            if (response.data && response.data.status === 'success') {
                onSave(); // Trigger refresh data di parent
                onClose(); // Tutup modal
            } else {
                setError(response.data?.message || "Gagal menyimpan produk.");
            }
        } catch (err) {
            console.error("Error saving product:", err);
            setError(err.response?.data?.message || "Gagal menyimpan produk.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Tutup"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-black text-slate-800 mb-6">
                    {productToEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
                </h2>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl mb-4 text-sm font-medium">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="barcode" className="block text-sm font-semibold text-slate-700 mb-1">Barcode</label>
                        <div className="relative">
                            <ScanBarcode className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                id="barcode"
                                name="barcode"
                                value={formData.barcode}
                                onChange={handleInputChange}
                                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                placeholder="Masukkan barcode produk"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleGenerateBarcode}
                                className="absolute right-2 top-1.5 p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Buat barcode otomatis"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Barcode otomatis dibuat, tetapi tetap bisa diganti dengan barcode asli.</p>
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">Nama Produk</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            placeholder="Contoh: Indomie Goreng"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="price" className="block text-sm font-semibold text-slate-700 mb-1">Harga (Rp)</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                placeholder="Contoh: 3500"
                                required
                                min="0"
                            />
                        </div>
                        <div>
                            <label htmlFor="stock" className="block text-sm font-semibold text-slate-700 mb-1">Stok</label>
                            <input
                                type="number"
                                id="stock"
                                name="stock"
                                value={formData.stock}
                                onChange={handleInputChange}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                placeholder="Contoh: 100"
                                required
                                min="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-1">Kategori</label>
                        <select
                            id="category"
                            name="category"
                            value={isCustomCategory ? '__new__' : formData.category}
                            onChange={(e) => {
                                const isNew = e.target.value === '__new__';
                                setIsCustomCategory(isNew);
                                if (!isNew) handleInputChange(e);
                                else setFormData(prev => ({ ...prev, category: '' }));
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            required
                        >
                            <option value="" disabled>Pilih kategori</option>
                            {categoryOptions.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                            <option value="__new__">+ Kategori baru</option>
                        </select>
                        {isCustomCategory && (
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full mt-2 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                placeholder="Masukkan nama kategori baru"
                                required
                                autoFocus
                            />
                        )}
                    </div>

                    {/* GAMBAR PRODUK DENGAN UPLOAD FILE */}
                    <div>
                        <div className="mb-1.5">
                            <label className="block text-sm font-semibold text-slate-700">Gambar Produk</label>
                        </div>

                        <div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:border-red-500 bg-slate-50 hover:bg-red-50/30 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group text-center">
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2 py-2">
                                            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                                            <p className="text-xs font-semibold text-slate-600">Mengunggah gambar ke server...</p>
                                        </div>
                                    ) : previewUrl ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <img
                                                src={previewUrl}
                                                alt="Preview Produk"
                                                className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x150?text=Gambar+Rusak'; }}
                                            />
                                            <p className="text-xs text-red-600 font-bold group-hover:underline">Klik untuk mengganti gambar file manager</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 py-3">
                                            <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6 text-red-600" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 mt-1">Pilih File dari File Manager Komputer</p>
                                            <p className="text-xs text-slate-400">PNG, JPG, WEBP atau GIF (Maks. 5MB)</p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm"
                            disabled={loading || uploading}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            disabled={loading || uploading}
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Menyimpan...' : (productToEdit ? 'Update Produk' : 'Tambah Produk')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
