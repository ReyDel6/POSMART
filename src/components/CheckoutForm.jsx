// File: src/components/CheckoutForm.jsx
import { useState, useMemo } from 'react';
import { useCartContext } from '../context/CartContext';
import { User, Phone, MapPin, Truck, ShoppingBag } from 'lucide-react';
import api from '../utils/api';

export default function CheckoutForm() {
    // 1. Ambil data keranjang belanja dan daftar produk asli dari Global Context
    const { cart, handleClearCart } = useCartContext();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // 2. State Multi-Input Terkontrol (Menggunakan satu Objek State agar bersih)
    const [formData, setFormData] = useState(() => {
        // Ambil data profile dari localStorage
        const savedProfile = localStorage.getItem('user_profile');
        let name = '';
        let phone = '';
        let address = '';
        let customerId = '';

        if (savedProfile) {
            try {
                const user = JSON.parse(savedProfile);
                name = user.name || '';
                phone = user.phone || '';
                address = user.address || '';
                customerId = user.id || '';
            } catch (e) {
                console.error("Gagal membaca user_profile:", e);
            }
        }

        // Kembalikan objek state utuh sejak detik pertama render
        return {
            fullName: name,
            phone: phone,
            address: address,
            courier: 'regular',
            customerId: customerId
        };
    });

    // State untuk menampung pesan kesalahan validasi
    const [errors, setErrors] = useState({});

    const cartDetails = useMemo(() => {
        // A. Map data langsung dari item keranjang
        const itemsReport = cart.map(cartItem => {
            const price = Number(cartItem.price) || 0;
            const qty = Number(cartItem.qty) || 0;

            return {
                id: cartItem.id,
                name: cartItem.name,
                qty: qty,
                price: price,
                total: price * qty
            };
        });

        // B. Hitung subtotal menggunakan .reduce()
        const subtotal = itemsReport.reduce((acc, item) => acc + item.total, 0);

        // C. Hitung ongkir berdasarkan kurir
        const shippingFee = formData.courier === 'express' ? 20000 : 10000;
        const grandTotal = subtotal + shippingFee;

        return { itemsReport, subtotal, shippingFee, grandTotal };
    }, [cart, formData.courier]);

    // 4. Handler universal untuk mendeteksi setiap ketikan user pada input form
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            // 1. Hanya izinkan angka numerik (0-9)
            let cleanedValue = value.replace(/\D/g, '');

            // 2. Proteksi: Jika user tidak sengaja mengetik angka '0' di awal, otomatis buang angka 0 tersebut
            if (cleanedValue.startsWith('0')) {
                cleanedValue = cleanedValue.substring(1);
            }

            // 3. Proteksi: Jika user copas nomor yang diawali '62', potong agar tidak ganda
            if (cleanedValue.startsWith('62')) {
                cleanedValue = cleanedValue.substring(2);
            }

            setFormData(prev => ({
                ...prev,
                [name]: cleanedValue
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Hapus pesan eror secara real-time begitu user mulai mengetik ulang
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // 5. Fungsi Validasi Form sebelum diproses
    const validateForm = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) newErrors.fullName = 'Nama lengkap wajib diisi';

        if (!formData.phone.trim()) {
            newErrors.phone = 'Nomor WhatsApp wajib diisi';
        } else if (formData.phone.length < 10) {
            newErrors.phone = 'Nomor WhatsApp minimal 10 digit';
        }

        if (!formData.address.trim()) newErrors.address = 'Alamat pengiriman wajib diisi';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Return true jika tidak ada eror
    };

    const totalPrice = cart.reduce((total, item) => total + (item.price * item.qty), 0);

    // 6. Handler saat tombol "Kirim Pesanan via WhatsApp" diklik
    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        // Format ulang struktur data cart agar sesuai kebutuhan loop 'foreach' di PHP
        const formattedCart = cart.map(item => ({
            product_id: item.id,
            qty: item.qty,
            price: item.price
        }));

        // Batalkan proses jika tidak lolos validasi form
        if (!validateForm()) {
            setLoading(false);
            return;
        }

        // Ambil token dari localStorage sebelum kirim
        const tokenJWT = localStorage.getItem('token');

        const whatsappFormattedPhone = `62${formData.phone}`;

        const payload = {
            customer_name: formData.fullName,
            phone: whatsappFormattedPhone,
            address: formData.address,
            courier: formData.courier,
            items: cartDetails.itemsReport,
            total_price: cartDetails.grandTotal,
            cart: formattedCart,
            access_token: tokenJWT,
            customer_id: formData.customerId
        };

        try {
            // 1. Kirim data transaksi ke backend
            const response = await api.post('/cart/create_order.php', payload);

            if (response.status >= 200 && response.status < 300) {
                // 2. Validasi mutlak struktur sukses dari backend PHP Anda
                if (response && response.data && response.data.status === 'success') {

                    // =================================================================
                    // PERBAIKAN: Deklarasikan whatsAppUrl
                    // =================================================================

                    // Nomor WA Toko (kode negara tanpa tanda '+')
                    const PHONE_NUMBER = whatsappFormattedPhone;

                    // Laporan pesanan belanjaan
                    let textMessage = `*PESANAN BARU - POSMART*\n\n`;
                    textMessage += `*Data Pengiriman:*\n`;
                    textMessage += `Nama: ${formData.fullName}\n`;
                    textMessage += `WA: ${whatsappFormattedPhone}\n`;
                    textMessage += `Alamat: ${formData.address}\n`;
                    textMessage += `Kurir: ${formData.courier.toUpperCase()}\n\n`;

                    textMessage += `*Daftar Belanjaan:*\n`;
                    cartDetails.itemsReport.forEach((item, index) => {
                        textMessage += `${index + 1}. ${item.name} (${item.qty}x) - Rp ${item.total.toLocaleString('id-ID')}\n`;
                    });

                    textMessage += `\n---------------------------\n`;
                    textMessage += `*Subtotal:* Rp ${cartDetails.subtotal.toLocaleString('id-ID')}\n`;
                    textMessage += `*Ongkos Kirim:* Rp ${cartDetails.shippingFee.toLocaleString('id-ID')}\n`;
                    textMessage += `*Total Bayar:* Rp ${cartDetails.grandTotal.toLocaleString('id-ID')}\n`;
                    textMessage += `---------------------------\n\n`;
                    textMessage += `Mohon segera diproses, terima kasih.`;

                    // encoding string URL agar teks spasi dan enter aman terbaca di browser
                    const encodedText = encodeURIComponent(textMessage);
                    const whatsAppUrl = `https://api.whatsapp.com/send?phone=${PHONE_NUMBER}&text=${encodedText}`;
                    window.open(whatsAppUrl, '_blank');

                    const summary = {
                        order_id: response.data.order_id,
                        customer_id: formData.customerId || `CUST-${Date.now().toString().slice(-4)}`,
                        customer_name: formData.fullName,
                        phone: whatsappFormattedPhone,
                        address: formData.address,
                        courier: formData.courier,
                        subtotal: cartDetails.subtotal,
                        shipping_fee: cartDetails.shippingFee,
                        total_price: cartDetails.grandTotal,
                        items: cartDetails.itemsReport,
                        created_at: new Date().toISOString(),
                    };
                    localStorage.setItem('last_order_summary', JSON.stringify(summary));

                    // Bersihkan keranjang belanja setelah sukses
                    handleClearCart();
                    window.location.href = `/OrderSuccess?order_id=${response.data.order_id}`;
                    // window.location.href = '/'; 
                } else {
                    alert(response.data?.message || 'Gagal memproses pesanan.');
                }
            } else {
                // === GAGAL (Status 400, 401, 500, dll) ===
                const errorMsg = response.data?.message || `Permintaan ditolak (Kode: ${response.status})`;
                setErrorMessage(errorMsg);
            }

        } catch (err) {
            const serverMessage = err.response?.data?.message || 'Terjadi kesalahan sistem saat checkout.';
            setErrorMessage(serverMessage);
            if (err.response && err.response.status === 401) {
                return;
            }
            alert(err.response?.data?.message || 'Terjadi kesalahan saat memproses pesanan.');
        } finally {
            setLoading(false);
        }

    };

    // Jika keranjang belanja kosong, tampilkan placeholder
    if (cart.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keranjang Anda masih kosong untuk checkout.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmitOrder} className="space-y-5 bg-white! p-2">

            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
                Informasi Pengiriman
            </h3>

            {/* Tampilkan Pesan Error Merah Jika Stok Habis/Gagal */}
            {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-semibold animate-shake">
                    ⚠️ {errorMessage}
                </div>
            )}

            {/* INPUT NAMA LENGKAP */}
            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Nama Lengkap</label>
                <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Masukkan nama penerima..."
                        className={`w-full text-sm pl-10 pr-3 py-2 border rounded-lg focus:outline-hidden transition-colors ${errors.fullName ? 'border-red-500 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-red-500'
                            }`}
                    />
                </div>
                {errors.fullName && <p className="text-[11px] text-red-600 font-medium">{errors.fullName}</p>}
            </div>

            {/* INPUT NOMOR WHATSAPP */}
            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Nomor WhatsApp</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none select-none">
                        {/* <span className="text-sm font-semibold text-slate-500 border-r border-slate-200 pr-2">
                            +62
                        </span> */}
                    </div>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="8123456789"
                        className={`w-full text-sm pl-10 pr-3 py-2 border rounded-lg focus:outline-hidden transition-colors ${errors.phone ? 'border-red-500 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-red-500'
                            }`}
                    />
                </div>
                {errors.phone && <p className="text-[11px] text-red-600 font-medium">{errors.phone}</p>}
            </div>

            {/* INPUT ALAMAT LENGKAP */}
            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Alamat Rumah Lengkap</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Nama jalan, nomor rumah, RT/RW, Kecamatan..."
                        className={`w-full text-sm pl-10 pr-3 py-2 border rounded-lg focus:outline-hidden transition-colors resize-none ${errors.address ? 'border-red-500 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-red-500'
                            }`}
                    />
                </div>
                {errors.address && <p className="text-[11px] text-red-600 font-medium">{errors.address}</p>}
            </div>

            {/* OPSI ONDOS KIRIM / METODE PENGIRIMAN */}
            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Layanan Pengiriman</label>
                <div className="relative">
                    <Truck className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <select
                        name="courier"
                        value={formData.courier}
                        onChange={handleInputChange}
                        className="w-full text-sm pl-10 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:outline-hidden focus:border-red-500 cursor-pointer"
                    >
                        <option value="regular">Reguler (2-3 Hari) - Rp 10.000</option>
                        <option value="express">Sameday Kilat (Hari Ini Sampai) - Rp 20.000</option>
                    </select>
                </div>
            </div>

            {/* RINGKASAN STRUK BELANJA TOTAL */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 mt-2">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal Barang:</span>
                    <span className="font-mono font-medium">Rp {cartDetails.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Ongkos Kirim ({formData.courier === 'express' ? 'Kilat' : 'Reguler'}):</span>
                    <span className="font-mono font-medium">Rp {cartDetails.shippingFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-dashed border-slate-200">
                    <span>Total Bayar:</span>
                    <span className="font-mono text-red-600">Rp {cartDetails.grandTotal.toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TOMBOL SUBMIT */}
            <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {loading ? 'Mengunci Stok & Memproses...' : `Bayar Sekarang (Rp ${totalPrice.toLocaleString('id-ID')})`}
            </button>
        </form>
    );
}