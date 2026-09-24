// File: src/components/CheckoutForm.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useCartContext } from '../context/CartContext';
import { User, Phone, MapPin, Truck, ShoppingBag, Coins, QrCode, Wallet, Landmark, Loader2, CheckCircle2, X } from 'lucide-react';
import api from '../utils/api';
import QRCode from 'qrcode';
import { usePromotions } from '../hooks/usePromotions';
import { linePrice, bundleLinePrice } from '../utils/pricing';

const EWALLET_CODES = ['gopay', 'shopeepay', 'ovo', 'dana'];
const TRANSFER_CODES = ['bank_transfer', 'echannel', 'bca_va', 'bni_va', 'bri_va', 'permata_va', 'other_va'];

const GROUP_OPTIONS = [
    { key: 'qris', label: 'QRIS', desc: 'Scan sekali jadi', icon: QrCode },
    { key: 'ewallet', label: 'E-Wallet', desc: 'GoPay/ShopeePay/OVO', icon: Wallet },
    { key: 'transfer', label: 'Transfer', desc: 'VA / Bank', icon: Landmark },
];

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

    // Grup metode online (M3): qris / ewallet / transfer
    const [paymentGroup, setPaymentGroup] = useState('qris');

    // Data QRIS aktif (modal pembayaran) + status sudah bayar
    const [qrisData, setQrisData] = useState(null);
    const [qrisBusy, setQrisBusy] = useState(false);
    const [qrImage, setQrImage] = useState(null);
    const pollingRef = useRef(null);
    const qrisPendingRef = useRef(0);

    // State untuk menampung pesan kesalahan validasi
    const [errors, setErrors] = useState({});

    // Informasi toko publik (nama + WA toko) untuk notifikasi pesanan
    const [storeSettings, setStoreSettings] = useState({});

    // Zona pengiriman aktif (dari backend)
    const [shippingZones, setShippingZones] = useState([]);

    // Poin member (M2): saldo & riwayat dari /user/points.php
    const [pointsInfo, setPointsInfo] = useState(null);
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToUse, setPointsToUse] = useState(0);

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
        if (localStorage.getItem('token')) {
            api.get('/user/points.php')
                .then(res => {
                    if (active && res.data && res.data.status === 'success') {
                        setPointsInfo(res.data.data);
                        setPointsToUse(Number(res.data.data?.points) || 0);
                    }
                })
                .catch(() => {});
        }
        return () => { active = false; };
    }, []);

    const storeName = storeSettings.store_name || 'POSMart';

    const promotions = usePromotions();

    const selectedZone = useMemo(() => {
        if (!formData.shippingZoneId || !shippingZones.length) return null;
        return shippingZones.find(z => String(z.id) === String(formData.shippingZoneId)) || null;
    }, [formData.shippingZoneId, shippingZones]);

    const cartDetails = useMemo(() => {
        const { byProduct: dealMap, byBundleId: bundleMap } = promotions ?? { byProduct: {}, byBundleId: {} };

        const itemsReport = cart.map(cartItem => {
            const qty = Number(cartItem.qty) || 1;

            // Baris paket/bundle
            if (cartItem.bundle_id) {
                const b = bundleMap[String(cartItem.bundle_id)];
                const lp = bundleLinePrice(b || { bundle_price: cartItem.price, list_total: cartItem.price }, qty);
                return {
                    id: null,
                    bundle_id: Number(cartItem.bundle_id),
                    name: cartItem.name || 'Paket',
                    qty: qty,
                    price: lp.unit,
                    unit_price: lp.unit,
                    total: lp.total,
                    discount: lp.discount,
                    label: lp.label,
                };
            }

            const deal = dealMap[cartItem.id];
            const lp = linePrice(cartItem, qty, deal);
            return {
                id: cartItem.id,
                name: cartItem.name,
                qty: qty,
                price: lp.unit,
                unit_price: lp.unit,
                total: lp.total,
                discount: lp.discount,
                label: lp.label,
                promo_id: deal?.id || 0,
            };
        });

        // B. Hitung subtotal & total potongan promo menggunakan .reduce()
        const subtotal = itemsReport.reduce((acc, item) => acc + item.total, 0);
        const promoDiscount = itemsReport.reduce((acc, item) => acc + item.discount, 0);

        // C. Hitung ongkir berdasarkan zona pengiriman (0 bila bayar tunai di kasir / walk-in)
        const shippingFee = paymentMode === 'cash'
            ? 0
            : (selectedZone ? (Number(selectedZone.fee) || 0) : (formData.courier === 'express' ? 20000 : 10000));
        const grandTotal = subtotal + shippingFee;

        return { itemsReport, subtotal, shippingFee, grandTotal, promoDiscount };
    }, [cart, paymentMode, selectedZone, formData.courier, promotions]);

    // Poin member: hitung potongan & total akhir setelah tukar poin.
    const redeemRate = Number(storeSettings.point_redeem_rate) || 0;
    const earningRate = Number(storeSettings.point_earning_rate) || 1;
    const availablePoints = pointsInfo?.points || 0;

    const pointsUsed = useMemo(() => {
        if (!usePoints || availablePoints <= 0) return 0;
        return Math.max(0, Math.min(Number(pointsToUse) || 0, availablePoints));
    }, [usePoints, pointsToUse, availablePoints]);

    const pointsDiscount = useMemo(() => {
        if (pointsUsed <= 0 || redeemRate <= 0) return 0;
        return Math.min(pointsUsed * redeemRate, cartDetails.subtotal + cartDetails.shippingFee);
    }, [pointsUsed, redeemRate, cartDetails.subtotal, cartDetails.shippingFee]);

    const finalTotal = Math.max(0, cartDetails.grandTotal - pointsDiscount);

    const toggleUsePoints = () => {
        setUsePoints(prev => {
            const next = !prev;
            if (next) setPointsToUse(availablePoints);
            return next;
        });
    };

    // Filter grup metode online sesuai setting toko (payment_methods).
    const groupAvailable = useMemo(() => {
        const raw = (storeSettings.payment_methods || '')
            .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (raw.length === 0 || raw.includes('snap')) {
            return { qris: true, ewallet: true, transfer: true };
        }
        return {
            qris: raw.includes('qris'),
            ewallet: EWALLET_CODES.some(c => raw.includes(c)),
            transfer: TRANSFER_CODES.some(c => raw.includes(c)),
        };
    }, [storeSettings.payment_methods]);

    const visibleGroups = GROUP_OPTIONS.filter(g => groupAvailable[g.key]);

    // =============================================================
    // Alur pasca-checkout (dipakai mode online & cash)
    // =============================================================
    const proceedLegacyFor = (orderId) => {
        const PHONE_NUMBER = storeSettings.whatsapp || whatsappPhone();
        let textMessage = `*PESANAN BARU - ${storeName.toUpperCase()}*\n\n`;
        textMessage += `*Data Pengiriman:*\n`;
        textMessage += `Nama: ${formData.fullName}\n`;
        textMessage += `WA: ${whatsappPhone()}\n`;
        textMessage += `Alamat: ${formData.address}\n`;
        textMessage += `Kurir/Zona: ${(paymentMode === 'cash' ? 'Walk-in' : (selectedZone ? selectedZone.name : 'Reguler')).toUpperCase()}\n\n`;

        textMessage += `*Daftar Belanjaan:*\n`;
        cartDetails.itemsReport.forEach((item, index) => {
            textMessage += `${index + 1}. ${item.name} (${item.qty}x) - Rp ${item.total.toLocaleString('id-ID')}\n`;
        });

        textMessage += `\n---------------------------\n`;
        textMessage += `*Subtotal:* Rp ${cartDetails.subtotal.toLocaleString('id-ID')}\n`;
        textMessage += `*Ongkos Kirim:* Rp ${cartDetails.shippingFee.toLocaleString('id-ID')}\n`;
        if (pointsDiscount > 0) {
            textMessage += `*Potongan Poin (${pointsUsed}):* -Rp ${pointsDiscount.toLocaleString('id-ID')}\n`;
        }
        textMessage += `*Total Bayar:* Rp ${finalTotal.toLocaleString('id-ID')}\n`;
        textMessage += `---------------------------\n\n`;
        textMessage += `Mohon segera diproses, terima kasih.`;

        const encodedText = encodeURIComponent(textMessage);
        const whatsAppUrl = `https://api.whatsapp.com/send?phone=${PHONE_NUMBER}&text=${encodedText}`;

        if (storeSettings.whatsapp) {
            window.open(whatsAppUrl, '_blank');
        }
    };

    const finishCheckoutFor = (orderId) => {
        if (setIsCartOpen) setIsCartOpen(false);
        window.location.href = `/OrderSuccess?order_id=${orderId}`;
    };

    const whatsappPhone = () => `62${formData.phone}`;

    // =============================================================
    // QRIS: polling status pembayaran
    // =============================================================
    useEffect(() => {
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    useEffect(() => {
        if (!qrisData?.qr_string) { setQrImage(null); return; }
        let active = true;
        QRCode.toDataURL(qrisData.qr_string, { errorCorrectionLevel: 'M', margin: 1, width: 280 })
            .then(url => { if (active) setQrImage(url); })
            .catch(() => { if (active) setQrImage(null); });
        return () => { active = false; };
    }, [qrisData]);

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const checkQrisPaid = async (orderId) => {
        try {
            const check = await api.post('/cart/midtrans_check_status.php', { order_id: orderId });
            if (check.data && check.data.paid) {
                stopPolling();
                proceedLegacyFor(orderId);
                finishCheckoutFor(orderId);
                return true;
            }
        } catch (err) {
            if (err.response?.status !== 401) { /* lanjut polling */ }
        }
        return false;
    };

    const startQrisPolling = (orderId) => {
        stopPolling();
        qrisPendingRef.current = 0;
        pollingRef.current = setInterval(async () => {
            qrisPendingRef.current += 4;
            const done = await checkQrisPaid(orderId);
            if (done || qrisPendingRef.current >= 90) {
                stopPolling();
                setQrisBusy(false);
            }
        }, 4000);
    };

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
            points_used: pointsUsed,
            items: cartDetails.itemsReport.map(it => it.bundle_id
                ? { bundle_id: it.bundle_id, qty: it.qty }
                : { id: it.id, qty: it.qty, promo_id: it.promo_id }),
            total_price: finalTotal,
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
                        discount: cartDetails.promoDiscount,
                        points_used: Number(response.data.points_used ?? pointsUsed),
                        points_discount: Number(response.data.points_discount ?? pointsDiscount),
                        total_price: Number(response.data.total_price ?? finalTotal),
                        items: cartDetails.itemsReport,
                        created_at: new Date().toISOString(),
                    };
                    localStorage.setItem('last_order_summary', JSON.stringify(summary));

                    // Kosongkan keranjang belanja segera karena pesanan sudah tersimpan di database
                    handleClearCart();
                    localStorage.removeItem('posmart');

                    // Pembayaran tunai/walk-in: langsung selesai tanpa Snap Midtrans.
                    if (paymentMode === 'cash' || response.data.payment_mode === 'cash') {
                        proceedLegacyFor(orderId);
                        finishCheckoutFor(orderId);
                        setLoading(false);
                        return;
                    }

                    // =============================================================
                    // M3: QRIS -> charge Core API, QR tampil di aplikasi + polling.
                    // =============================================================
                    if (paymentGroup === 'qris') {
                        try {
                            const chargeRes = await api.post('/cart/midtrans_charge.php', { order_id: orderId, group: 'qris' });
                            if (chargeRes.data && chargeRes.data.status === 'success') {
                                setQrisData({
                                    order_id: orderId,
                                    qr_string: chargeRes.data.qr_string,
                                    total_price: chargeRes.data.total_price,
                                    expiry: chargeRes.data.expiry_minutes,
                                });
                                setLoading(false);
                                setQrisBusy(false);
                                if (setIsCartOpen) setIsCartOpen(false);
                                startQrisPolling(orderId);
                                return;
                            }
                            // disabled / use_snap / error -> lanjut ke Snap (grup qris).
                            console.warn('[QRIS]', chargeRes.data?.message || 'QRIS tidak tersedia, pakai Snap.');
                        } catch (chargeErr) {
                            console.error('[QRIS Charge Error]', chargeErr);
                        }
                    }

                    try {
                        const snapRes = await api.post('/cart/midtrans_snap.php', { order_id: orderId, group: paymentGroup });

                        // Pembayaran online nonaktif (key belum diisi) -> alur lama.
                        if (!snapRes.data || snapRes.data.status !== 'success') {
                            console.warn('[Midtrans]', snapRes.data?.message || 'Midtrans response not successful');
                            proceedLegacyFor(orderId);
                            finishCheckoutFor(orderId);
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
                                proceedLegacyFor(orderId);
                                finishCheckoutFor(orderId);
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
                                if (paid) proceedLegacyFor(orderId);
                                finishCheckoutFor(orderId);
                            },
                            onError: (err) => {
                                console.error('[Midtrans Payment Error]', err);
                                finishCheckoutFor(orderId);
                            },
                            onClose: () => {
                                finishCheckoutFor(orderId);
                            },
                        });
                    } catch (snapErr) {
                        // Snap gagal dimuat/dijalankan -> alur lama agar pesanan tetap tertangani.
                        console.error('[Midtrans Snap Load/Run Error]', snapErr);
                        proceedLegacyFor(orderId);
                        finishCheckoutFor(orderId);
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
        if (qrisData) {
            return (
                <QrisPaymentModal
                    qrisData={qrisData}
                    qrisBusy={qrisBusy}
                    onCheckNow={async () => {
                        setQrisBusy(true);
                        await checkQrisPaid(qrisData.order_id);
                        setQrisBusy(false);
                    }}
                    onDone={() => finishCheckoutFor(qrisData.order_id)}
                    onClose={() => { stopPolling(); setQrisData(null); }}
                />
            );
        }
        return (
            <div className="text-center py-8 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keranjang Anda masih kosong untuk checkout.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmitOrder} className="space-y-5 bg-white! p-2">

            <h3 className="font-black text-base text-ink border-b-2 border-ink pb-2">
                Informasi Pengiriman
            </h3>

            {/* Tampilkan Pesan Error Merah Jika Stok Habis/Gagal */}
            {errorMessage && (
                <div className="p-3 bg-red-50 border-2 border-ink text-red-700 rounded-lg text-sm font-bold animate-shake">
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
                            ? 'border-ink bg-lime text-ink shadow-[2px_2px_0_#161616]'
                            : 'border-ink/30 bg-white text-slate-500 hover:border-ink'
                        }`}
                    >
                        Bayar Online
                        <span className="block font-medium text-[10px] text-slate-400 mt-0.5">Midtrans / Transfer</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentMode('cash')}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all cursor-pointer ${paymentMode === 'cash'
                            ? 'border-ink bg-lime text-ink shadow-[2px_2px_0_#161616]'
                            : 'border-ink/30 bg-white text-slate-500 hover:border-ink'
                        }`}
                    >
                        Tunai di Kasir
                        <span className="block font-medium text-[10px] text-slate-400 mt-0.5">Walk-in / ambil di toko</span>
                    </button>
                </div>
            </div>

            {/* PILIH METODE ONLINE (QRIS / E-WALLET / TRANSFER) */}
            {paymentMode === 'online' && visibleGroups.length > 0 && (
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Pilih Cara Bayar</label>
                    <div className={`grid gap-2 ${visibleGroups.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {visibleGroups.map(opt => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setPaymentGroup(opt.key)}
                                    className={`rounded-xl border px-2 py-2.5 text-left text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${paymentGroup === opt.key
                                        ? 'border-ink bg-lime text-ink shadow-[2px_2px_0_#161616]'
                                        : 'border-ink/30 bg-white text-slate-500 hover:border-ink'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {opt.label}
                                    <span className="block font-medium text-[9px] text-slate-400 leading-tight text-center">{opt.desc}</span>
                                </button>
                            );
                        })}
                    </div>
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

            {/* TUKAR POIN MEMBER */}
            {availablePoints > 0 && (
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-500" /> Tukar Poin
                    </label>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                        Saldo: {availablePoints.toLocaleString('id-ID')} poin
                    </span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                    <button
                        type="button"
                        onClick={toggleUsePoints}
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${usePoints ? 'bg-amber-500' : 'bg-slate-300'}`}
                        aria-label="Pakai poin"
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${usePoints ? 'translate-x-4' : ''}`} />
                    </button>
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">
                            {usePoints ? `Potongan Rp ${pointsDiscount.toLocaleString('id-ID')}` : 'Pakai poin sebagai potongan harga'}
                        </p>
                        {usePoints ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number"
                                    min="0"
                                                    max={availablePoints}
                                    value={pointsToUse}
                                    onChange={(e) => setPointsToUse(e.target.value)}
                                    className="w-28 text-sm px-2 py-1 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                />
                                <span className="text-[11px] text-slate-500">poin (maks {availablePoints})</span>
                            </div>
                        ) : null}
                    </div>
                </div>
                <p className="text-[11px] text-slate-400">
                    {redeemRate > 0 ? `1 poin = Rp ${redeemRate.toLocaleString('id-ID')} · ` : ''}Belanja Rp 1.000 = {earningRate} poin. Poin yang dipakai dikembalikan bila pesanan dibatalkan.
                </p>
            </div>
            )}

            {/* RINGKASAN STRUK BELANJA TOTAL */}
            <div className="bg-cream rounded-xl p-4 border-2 border-ink shadow-[3px_3px_0_#161616] space-y-2 mt-2">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal Barang:</span>
                    <span className="font-mono font-medium">Rp {cartDetails.subtotal.toLocaleString('id-ID')}</span>
                </div>
                {cartDetails.promoDiscount > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-emerald-600">
                        <span>Hemat Promo ({cartDetails.itemsReport.filter(i => i.discount > 0).length} item):</span>
                        <span className="font-mono">-Rp {cartDetails.promoDiscount.toLocaleString('id-ID')}</span>
                    </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                    <span>{paymentMode === 'cash' ? 'Tunai di Kasir (Walk-in):' : `Ongkos Kirim (${selectedZone ? selectedZone.name : 'Reguler'}):`}</span>
                    <span className="font-mono font-medium">Rp {cartDetails.shippingFee.toLocaleString('id-ID')}</span>
                </div>
                {pointsDiscount > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-amber-600">
                        <span>Potongan Poin ({pointsUsed.toLocaleString('id-ID')} poin):</span>
                        <span className="font-mono">-Rp {pointsDiscount.toLocaleString('id-ID')}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-black text-ink pt-2 border-t-2 border-ink/15">
                    <span>Total Bayar:</span>
                    <span className="font-mono text-coral">Rp {finalTotal.toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TOMBOL SUBMIT */}
            <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full bg-ink hover:bg-slate-900 text-cream font-black py-3 px-4 rounded-xl border-2 border-ink shadow-[4px_4px_0_#161616] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex justify-center items-center"
            >
                {loading ? 'Mengunci Stok & Memproses...' : `Bayar Sekarang (Rp ${finalTotal.toLocaleString('id-ID')})`}
            </button>
        </form>
    );
}

function QrisPaymentModal({ qrisData, qrisBusy, onCheckNow, onDone, onClose }) {
    const total = Number(qrisData?.total_price) || 0;

    return (
        <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-pop-in">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between text-white">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">QRIS</p>
                        <p className="text-lg font-black">Scan untuk Bayar</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors cursor-pointer" aria-label="Tutup">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center">
                    <p className="text-2xl font-black text-slate-900">
                        Rp {total.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Scan QR di bawah dengan aplikasi apa pun yang mendukung QRIS (GoPay, ShopeePay, OVO, DANA, m-Banking).</p>

                    <div className="bg-white border-2 border-emerald-100 rounded-2xl p-3 shadow-inner">
                        {qrImage ? (
                            <img src={qrImage} alt="QR Code pembayaran" className="w-56 h-56" />
                        ) : (
                            <div className="w-56 h-56 flex items-center justify-center text-slate-300">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-3">
                        Berlaku {Number(qrisData?.expiry) || 15} menit · status dicek otomatis
                    </p>

                    <div className="mt-4 space-y-2 w-full">
                        <button
                            type="button"
                            onClick={onCheckNow}
                            disabled={qrisBusy}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer"
                        >
                            {qrisBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {qrisBusy ? 'Memeriksa...' : 'Saya Sudah Bayar'}
                        </button>
                        <button
                            type="button"
                            onClick={onDone}
                            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer"
                        >
                            Lihat Status Pesanan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}