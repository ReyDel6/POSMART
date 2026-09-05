// File: src/pages/admin/AdminSettingsPage.jsx
import { useState } from 'react';
import { Settings, Store, Printer, Save } from 'lucide-react';

export default function AdminSettingsPage() {
    const [storeName, setStoreName] = useState('POSMart Fresh');
    const [address, setAddress] = useState('Jl. Raya Bogor No. 45, Jakarta Timur');
    const [phone, setPhone] = useState('081234567890');
    const [receiptFooter, setReceiptFooter] = useState('Terima kasih telah berbelanja di POSMart! Barang yang sudah dibeli tidak dapat ditukar.');

    const handleSave = (e) => {
        e.preventDefault();
        alert('Pengaturan toko berhasil disimpan!');
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-red-600" /> Pengaturan Toko & Struk
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Konfigurasi informasi umum toko dan cetakan struk pembayaran</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Store className="w-5 h-5 text-red-600" /> Informasi Toko
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Toko / Minimarket</label>
                            <input 
                                type="text" 
                                value={storeName} 
                                onChange={(e) => setStoreName(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nomor Telepon Toko</label>
                            <input 
                                type="text" 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Alamat Lengkap Toko</label>
                        <input 
                            type="text" 
                            value={address} 
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            required 
                        />
                    </div>
                </div>

                <div className="space-y-4 pb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Printer className="w-5 h-5 text-red-600" /> Cetakan Struk Kasir
                    </h3>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pesan Footer Struk</label>
                        <textarea 
                            value={receiptFooter} 
                            onChange={(e) => setReceiptFooter(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button 
                        type="submit"
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-md"
                    >
                        <Save className="w-4 h-4" /> Simpan Pengaturan
                    </button>
                </div>
            </form>
        </div>
    );
}
