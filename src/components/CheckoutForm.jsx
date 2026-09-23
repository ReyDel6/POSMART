// File: src/components/CheckoutForm.jsx
import { useState, useMemo, useEffect } from 'react';
import { useCartContext } from '../context/CartContext';
import { User, Phone, MapPin, Truck, ShoppingBag } from 'lucide-react';
import api from '../utils/api';

export default function CheckoutForm() {
    // 1. Ambil data keranjang belanja dan daftar produk asli dari Global Context
    const { cart, handleClearCart, setIsCartOpen } = useCartContext();
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
            shippingZoneId: '',
            customerId: customerId
        };
    });

    // Pilih metode bayar: 'online' (Midtrans/WA) atau 'cash' (tunai di kasir/walk-in)
    const [paymentMode, setPaymentMode] = useState('online');

    // State untuk menampung pesan kesalahan validasi
    const [errors, setErrors] = useState({});

    // Informasi toko publik (nama + WA toko) untuk notifikasi pesanan
    const [storeSettings, setStoreSettings] = useState({});

    // Zona pengiriman aktif (dari backend)
    const [shippingZones, setShippingZones] = useState([]);

    useEffect(() => {
        let active = true;
        api.get('/public/settings.php')
            .then(res => {
                if (active && res.data && res.data.status === 'success') {
                    setStoreSettings(res.data.data || {});
                }
            })
            .catch(() => {});
        api.get('/shipping_zones.php')
            .then(res => {
                if (active && res.data && res.data.status === 'success') {
                    const zones = res.data.data || [];
                    setShippingZones(zones);
                    // Default: pilih zona pertama
                    setFormData(prev => ({ ...prev, shippingZoneId: zones.length ? String(zones[0].id) : '' }));
                }
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const storeName = storeSettings.store_name || 'POSMart';

    const selectedZone = useMemo(() => {
        if (!formData.shippingZoneId || !shippingZones.length) return null;
        return shippingZones.find(z => String(z.id) === String(formData.shippingZoneId)) || null;
    }, [formData.shippingZoneId, shippingZones]);

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

        // C. Hitung ongkir berdasarkan zona pengiriman (0 bila bayar tunai di kasir / walk-in)
        const shippingFee = paymentMode === 'cash'
            ? 0
            : (selectedZone ? (Number(selectedZone.fee) || 0) : (formData.courier === 'express' ? 20000 : 10000));
        const grandTotal = subtotal + shippingFee;

        return { itemsReport, subtotal, shippingFee, grandTotal };
    }, [cart, paymentMode, selectedZone, formData.courier]);

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

        if (!formData.address.trim() && paymentMode !== 'cash') newErrors.address = 'Alamat pengiriman wajib diisi';

        if (paymentMode !== 'cash' && !formData.shippingZoneId) newErrors.shippingZoneId = 'Pilih zona pengiriman terlebih dahulu';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Return true jika tidak ada eror
    };

    // 6. Handler saat tombol "Bayar Sekarang" diklik
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

        const effectiveCourier = paymentMode === 'cash'
            ? 'walkin'
            : (selectedZone ? selectedZone.name : formData.courier);

        const payload = {
            customer_name: formData.fullName,
            phone: whatsappFormattedPhone,
            address: formData.address,
            courier: effectiveCourier,
            shipping_zone_id: paymentMode === 'cash' ? null : (selectedZone ? selectedZone.id : null),
            payment_mode: paymentMode,
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

                    const orderId = response.data.order_id;

                    // Simpan ringkasan order segera agar halaman OrderSuccess selalu memiliki data lengkap
                    const summary = {
                        order_id: orderId,
                        customer_id: formData.customerId || `CUST-${Date.now().toString().slice(-4)}`,
                        customer_name: formData.fullName,
                        phone: whatsappFormattedPhone,
                        address: formData.address,
                        courier: effectiveCourier,
                        subtotal: cartDetails.subtotal,
                        shipping_fee: cartDetails.shippingFee,
                        total_price: cartDetails.grandTotal,
                        items: cartDetails.itemsReport,
                        created_at: new Date().toISOString(),
                    };
                    localStorage.setItem('last_order_summary', JSON.stringify(summary));

                    // Kosongkan keranjang belanja segera karena pesanan sudah tersimpan di database
                    handleClearCart();
                    localStorage.removeItem('posmart');

                    // Buka pembayaran Snap Midtrans, lalu setelah sukses lanjut alur lama.
                    const proceedLegacy = () => {
                        const PHONE_NUMBER = storeSettings.whatsapp || whatsappFormattedPhone;
                        let textMessage = `*PESANAN BARU - ${storeName.toUpperCase()}*\n\n`;
                        textMessage += `*Data Pengiriman:*\n`;
                        textMessage += `Nama: ${formData.fullName}\n`;
                        textMessage += `WA: ${whatsappFormattedPhone}\n`;
                        textMessage += `Alamat: ${formData.address}\n`;
                        textMessage += `Kurir/Zona: ${effectiveCourier.toUpperCase()}\n\n`;

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

                        const encodedText = encodeURIComponent(textMessage);
                        const whatsAppUrl = `https://api.whatsapp.com/send?phone=${PHONE_NUMBER}&text=${encodedText}`;

                        if (storeSettings.whatsapp) {
                            window.open(whatsAppUrl, '_blank');
                        }
                    };

                    const finishCheckout = () => {
                        if (setIsCartOpen) setIsCartOpen(false);
                        window.location.href = `/OrderSuccess?order_id=${orderId}`;
                    };

                    // Pembayaran tunai/walk-in: langsung selesai tanpa Snap Midtrans.
                    if (paymentMode === 'cash' || response.data.payment_mode === 'cash') {
                        proceedLegacy();
                        finishCheckout();
                        setLoading(false);
                        return;
                    }

                    try {
                        const snapRes = await api.post('/cart/midtrans_snap.php', { order_id: orderId });

                        // Pembayaran online nonaktif (key belum diisi) -> alur lama.
                        if (!snapRes.data || snapRes.data.status !== 'success') {
                            console.warn('[Midtrans]', snapRes.data?.message || 'Midtrans response not successful');
                            proceedLegacy();
                            finishCheckout();
                            return;
                        }

                        // Muat skrip snap.js dengan client key dari backend.
                        const snapScript = new Promise((resolve, reject) => {
                            if (window.snap) { resolve(); return; }
                            const script = document.createElement('script');
                            script.src = snapRes.data.snap_js_url;
                            script.setAttribute('data-client-key', snapRes.data.client_key);
                            script.onload = () => resolve();
                            script.onerror = () => reject(new Error('Gagal memuat pembayaran Snap'));
                            document.body.appendChild(script);
                        });

                        await snapScript;

                        // Tutup modal keranjang sebelum popup Snap muncul
                        if (setIsCartOpen) setIsCartOpen(false);

                        window.snap.pay(snapRes.data.snap_token, {
                            onSuccess: async (result) => {
                                try {
                                    await api.post('/cart/midtrans_check_status.php', { order_id: orderId });
                                } catch { /* tetap lanjut, webhook akan sinkron */ }
                                proceedLegacy();
                                finishCheckout();
                            },
                            onPending: async () => {
                                // Tunggu konfirmasi pembayaran (maks ±30 detik).
                                let paid = false;
                                for (let i = 0; i < 8; i++) {
                                    await new Promise(r => setTimeout(r, 4000));
                                    try {
                                        const check = await api.post('/cart/midtrans_check_status.php', { order_id: orderId });
                                        if (check.data && check.data.paid) { paid = true; break; }
                                    } catch { /* lanjut polling */ }
                                }
                                if (paid) proceedLegacy();
                                finishCheckout();
                            },
                            onError: (err) => {
                                console.error('[Midtrans Payment Error]', err);
                                finishCheckout();
                            },
                            onClose: () => {
                                finishCheckout();
                            },
                        });
                    } catch (snapErr) {
                        // Snap gagal dimuat/dijalankan -> alur lama agar pesanan tetap tertangani.
                        console.error('[Midtrans Snap Load/Run Error]', snapErr);
                        proceedLegacy();
                        finishCheckout();
                    } 
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

            {/* METODE PEMBAYARAN */}
            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setPaymentMode('online')}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all cursor-pointer ${paymentMode === 'online'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300'
                        }`}
                    >
                        Bayar Online
                        <span className="block font-medium text-[10px] text-slate-400 mt-0.5">Midtrans / Transfer</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentMode('cash')}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all cursor-pointer ${paymentMode === 'cash'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300'
                        }`}
                    >
                        Tunai di Kasir
                        <span className="block font-medium text-[10px] text-slate-400 mt-0.5">Walk-in / ambil di toko</span>
                    </button>
                </div>
            </div>

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
            {paymentMode !== 'cash' && (
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
            )}

            {/* OPSI ZONA PENGIRIMAN */}
            {paymentMode !== 'cash' && (
            <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Zona Pengiriman</label>
                <div className="relative">
                    <Truck className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <select
                        name="shippingZoneId"
                        value={formData.shippingZoneId}
                        onChange={handleInputChange}
                        className={`w-full text-sm pl-10 pr-3 py-2 border rounded-lg focus:outline-hidden transition-colors cursor-pointer ${errors.shippingZoneId ? 'border-red-500 focus:border-red-500 bg-red-50/30' : 'border-slate-200 bg-slate-50 focus:border-red-500'
                            }`}
                    >
                        {shippingZones.length === 0 && (
                            <option value="">Zona tidak tersedia...</option>
                        )}
                        {shippingZones.map(zone => (
                            <option key={zone.id} value={zone.id}>
                                {zone.name} - Rp {Number(zone.fee).toLocaleString('id-ID')}
                            </option>
                        ))}
                    </select>
                </div>
                {errors.shippingZoneId && <p className="text-[11px] text-red-600 font-medium">{errors.shippingZoneId}</p>}
                {shippingZones.length === 0 && (
                    <p className="text-[11px] text-amber-600 font-medium">Zona belum diatur admin. Hubungi toko untuk konfirmasi ongkir.</p>
                )}
            </div>
            )}

            {paymentMode === 'cash' && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                    <ShoppingBag className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">Pesanan walk-in: bayar tunai langsung di kasir toko, bebas ongkir. Cukup isi nama & nomor WhatsApp agar transaksi tercatat baik.</p>
                </div>
            )}

            {/* RINGKASAN STRUK BELANJA TOTAL */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 mt-2">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal Barang:</span>
                    <span className="font-mono font-medium">Rp {cartDetails.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>{paymentMode === 'cash' ? 'Tunai di Kasir (Walk-in):' : `Ongkos Kirim (${selectedZone ? selectedZone.name : 'Reguler'}):`}</span>
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
                {loading ? 'Mengunci Stok & Memproses...' : `Bayar Sekarang (Rp ${cartDetails.grandTotal.toLocaleString('id-ID')})`}
            </button>
        </form>
    );
}