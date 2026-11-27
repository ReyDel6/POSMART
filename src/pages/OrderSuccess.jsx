// File: src/pages/OrderSuccess.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, Download, Printer, RefreshCcw, ShoppingBag, MapPin, Truck, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import QRCode from 'qrcode';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { useCartContext } from '../context/CartContext';

// Format tanggal menjadi: "03 Nov 2026, 17:00 WIB"
function formatDeadline(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}

export default function OrderSuccess() {
    const { handleClearCart } = useCartContext();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');

    const [orderSummary] = useState(() => {
        const savedSummary = localStorage.getItem('last_order_summary');
        if (!savedSummary) return null;
        try { return JSON.parse(savedSummary); } catch { return null; }
    });

    const [downloadLoading, setDownloadLoading] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [storeName, setStoreName] = useState('POSMart');
    const [storeAddress, setStoreAddress] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [paymentDeadline, setPaymentDeadline] = useState(null);
    const [snapToken, setSnapToken] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Apakah pesanan ini walk-in (bayar di kasir)?
    const isWalkIn = orderSummary?.courier === 'walkin' || orderSummary?.payment_mode === 'cash';

    const checkPayment = async () => {
        const idToCheck = orderId || orderSummary?.order_id;
        if (!idToCheck) return;
        setCheckingStatus(true);
        try {
            const res = await api.post('/cart/midtrans_check_status.php', { order_id: Number(idToCheck) });
            if (res.data && res.data.paid) {
                setPaymentStatus('paid');
            } else if (res.data?.payment_status) {
                setPaymentStatus(res.data.payment_status);
            }
            // Ambil deadline jika ada
            if (res.data?.expiry_time) setPaymentDeadline(res.data.expiry_time);
            if (res.data?.snap_token) setSnapToken(res.data.snap_token);
        } catch (e) {
            console.warn('Cek status pembayaran:', e);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Buka Midtrans Snap popup untuk menyelesaikan pembayaran
    const handleFinishPayment = async () => {
        if (!snapToken) {
            // Coba ambil snap token dari backend
            const idToCheck = orderId || orderSummary?.order_id;
            try {
                const snapRes = await api.post('/cart/midtrans_snap.php', { order_id: idToCheck });
                if (snapRes.data?.snap_token) {
                    openSnap(snapRes.data.snap_token, snapRes.data);
                } else if (snapRes.data?.redirect_url) {
                    window.open(snapRes.data.redirect_url, '_blank');
                }
            } catch (e) {
                console.error('Gagal memuat Snap:', e);
            }
            return;
        }
        openSnap(snapToken, null);
    };

    const openSnap = (token, snapData) => {
        const loadAndPay = () => {
            if (window.snap?.pay) {
                window.snap.pay(token, {
                    onSuccess: () => setPaymentStatus('paid'),
                    onPending: () => checkPayment(),
                    onError: () => checkPayment(),
                    onClose: () => checkPayment(),
                });
            }
        };

        if (!window.snap && snapData?.snap_js_url) {
            const script = document.createElement('script');
            script.src = snapData.snap_js_url;
            if (snapData.client_key) script.setAttribute('data-client-key', snapData.client_key);
            script.onload = loadAndPay;
            document.body.appendChild(script);
        } else {
            loadAndPay();
        }
    };

    useEffect(() => { checkPayment(); }, [orderId]);

    useEffect(() => {
        if (handleClearCart) handleClearCart();
        localStorage.removeItem('posmart');
    }, [handleClearCart]);

    useEffect(() => {
        let active = true;
        api.get('/public/settings.php')
            .then(res => {
                if (active && res.data?.status === 'success') {
                    if (res.data.data?.store_name) setStoreName(res.data.data.store_name);
                    if (res.data.data?.store_address) setStoreAddress(res.data.data.store_address);
                }
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!orderSummary) return;
        const qrData = `Order:${orderSummary.order_id}|Customer:${orderSummary.customer_id ?? 'N/A'}|Total:${orderSummary.total_price}`;
        QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', margin: 1, width: 150 })
            .then(url => setQrCodeUrl(url))
            .catch(err => console.error('Gagal membuat QR code:', err));
    }, [orderSummary]);

    const handleDownloadInvoice = async () => {
        if (!orderSummary) return;
        setDownloadLoading(true);
        try {
            const doc = await generateInvoicePdf(orderSummary, storeName);
            doc.save(`invoice_order_${orderSummary.order_id}.pdf`);
        } catch (error) {
            console.error('Gagal membuat PDF invoice:', error);
            alert('Gagal membuat invoice PDF. Coba lagi.');
        } finally {
            setDownloadLoading(false);
        }
    };

    const handlePrintInvoice = () => window.print();

    const isPaid = paymentStatus === 'paid';

    return (
        <>
        {/* ===== STRUK PRINT (hanya tampil saat print) ===== */}
        {orderSummary && (
            <div className="receipt-print">
                <div className="receipt-store">{storeName}</div>
                <div className="receipt-title">STRUK PEMBAYARAN</div>
                <div className="receipt-line">------------------------------------</div>
                <div className="receipt-row"><span>No. Order</span><span>#{orderSummary.order_id}</span></div>
                <div className="receipt-row"><span>Tanggal</span><span>{new Date().toLocaleString('id-ID')}</span></div>
                <div className="receipt-row"><span>Customer</span><span>{orderSummary.customer_name}</span></div>
                <div className="receipt-row"><span>Kurir</span><span>{orderSummary.courier}</span></div>
                <div className="receipt-line">------------------------------------</div>
                {orderSummary.items.map((item, index) => (
                    <div key={index}>
                        <div className="receipt-item-name">{index + 1}. {item.name}</div>
                        <div className="receipt-row">
                            <span>{item.qty} x Rp {item.price.toLocaleString('id-ID')}</span>
                            <span>Rp {item.total.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
                <div className="receipt-line">------------------------------------</div>
                <div className="receipt-row"><span>Subtotal</span><span>Rp {orderSummary.subtotal.toLocaleString('id-ID')}</span></div>
                <div className="receipt-row"><span>Ongkir</span><span>Rp {orderSummary.shipping_fee.toLocaleString('id-ID')}</span></div>
                {Number(orderSummary.discount) > 0 && (
                    <div className="receipt-row text-emerald-600">
                        <span>Hemat Promo</span><span>-Rp {Number(orderSummary.discount).toLocaleString('id-ID')}</span>
                    </div>
                )}
                {Number(orderSummary.points_discount) > 0 && (
                    <div className="receipt-row">
                        <span>Poin ({orderSummary.points_used} poin)</span>
                        <span>-Rp {Number(orderSummary.points_discount).toLocaleString('id-ID')}</span>
                    </div>
                )}
                <div className="receipt-total"><span>TOTAL</span><span>Rp {orderSummary.total_price.toLocaleString('id-ID')}</span></div>
                <div className="receipt-line">------------------------------------</div>
                {qrCodeUrl && (
                    <div className="receipt-qr-wrap">
                        <img src={qrCodeUrl} alt="QR" className="receipt-qr" />
                    </div>
                )}
                <div className="receipt-thanks">Terima kasih telah berbelanja di {storeName}!</div>
            </div>
        )}

        <div className="max-w-2xl mx-auto my-16 p-6 bg-white border-2 border-ink shadow-[8px_8px_0_#161616] rounded-2xl text-center">

            {/* ===== HEADER: Ikon & Judul Dinamis ===== */}
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full border-2 border-ink flex items-center justify-center ${
                isPaid ? 'bg-lime' : 'bg-amber-100'
            }`}>
                {isPaid
                    ? <CheckCircle className="w-10 h-10 text-ink" />
                    : <Clock className="w-10 h-10 text-amber-500" />
                }
            </div>
            <h2 className="text-xl font-black text-ink">
                {isPaid ? 'Pesanan Berhasil Dibuat!' : 'Pesanan Menunggu Pembayaran'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
                ID Transaksi Anda: <span className="font-mono font-black text-ink">#{orderId}</span>
            </p>

            {/* ===== BADGE STATUS + DEADLINE + CTA PEMBAYARAN ===== */}
            <div className="mt-4 flex flex-col items-center gap-2">
                {/* Badge */}
                {isPaid ? (
                    <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full border-2 border-ink shadow-[2px_2px_0_#161616] inline-flex items-center gap-1.5 text-xs font-black">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        Pembayaran Berhasil (LUNAS)
                    </span>
                ) : (
                    <span className="bg-coral text-white px-4 py-1.5 rounded-full border-2 border-ink shadow-[2px_2px_0_#161616] inline-flex items-center gap-1.5 text-xs font-black">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        Menunggu Pembayaran
                    </span>
                )}

                {/* Deadline pembayaran */}
                {!isPaid && paymentDeadline && (
                    <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                        ⏳ Bayar sebelum {formatDeadline(paymentDeadline)}
                    </p>
                )}

                {/* CTA: Walk-in → cek status, Online → selesaikan pembayaran */}
                {!isPaid && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                        {/* Tombol utama: selesaikan pembayaran (hanya untuk non walk-in) */}
                        {!isWalkIn && (
                            <button
                                type="button"
                                onClick={handleFinishPayment}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink hover:bg-slate-900 text-cream border-2 border-ink rounded-xl text-xs font-black shadow-[3px_3px_0_#161616] transition-all cursor-pointer"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Selesaikan Pembayaran
                            </button>
                        )}
                        {/* Tombol sekunder: cek status */}
                        <button
                            type="button"
                            onClick={checkPayment}
                            disabled={checkingStatus}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 border-ink transition-all cursor-pointer disabled:opacity-50 shadow-[2px_2px_0_#161616] ${
                                isWalkIn
                                    ? 'bg-ink text-cream hover:bg-slate-900'   // walk-in: tombol utama
                                    : 'bg-slate-100 hover:bg-slate-200 text-ink' // online: tombol sekunder
                            }`}
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                            {checkingStatus ? 'Mengecek...' : 'Cek Status Pembayaran'}
                        </button>
                    </div>
                )}
            </div>

            <hr className="my-6 border-ink/15" />

            {/* ===== DETAIL PESANAN ===== */}
            {orderSummary ? (
                <div className="text-left space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-6 items-start">
                        <div className="space-y-3">
                            {/* Kartu Detail Pesanan */}
                            <div className="rounded-2xl border-2 border-ink bg-[#EFEFE6] p-4">
                                <h3 className="text-sm font-black text-ink mb-3">Detail Pesanan</h3>
                                <p className="text-xs text-slate-500">Order ID: <span className="font-mono text-ink">#{orderSummary.order_id}</span></p>
                                <p className="text-xs text-slate-500">Customer ID: <span className="font-mono text-ink">{orderSummary.customer_id ?? '-'}</span></p>
                                <p className="text-xs text-slate-500">Nama: <span className="text-ink">{orderSummary.customer_name}</span></p>
                                <p className="text-xs text-slate-500">Total: <span className="text-ink font-black">Rp {orderSummary.total_price.toLocaleString('id-ID')}</span></p>
                            </div>

                            {/* Kartu Metode Pengiriman / Pengambilan */}
                            <div className="rounded-2xl border-2 border-ink bg-[#EFEFE6] p-4">
                                <h3 className="text-sm font-black text-ink mb-3 flex items-center gap-1.5">
                                    {isWalkIn
                                        ? <><ShoppingBag className="w-4 h-4" /> Pengambilan di Toko</>
                                        : <><Truck className="w-4 h-4" /> Pengiriman ke Alamat</>
                                    }
                                </h3>
                                {isWalkIn ? (
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500 flex items-start gap-1">
                                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
                                            <span>
                                                <span className="font-bold text-ink">{storeName}</span>
                                                {storeAddress && <><br />{storeAddress}</>}
                                            </span>
                                        </p>
                                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-2">
                                            ⏳ Pesanan dibatalkan otomatis jika tidak diambil & dibayar dalam <strong>2 jam</strong>.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500">
                                            Zona/Kurir: <span className="font-bold text-ink">{orderSummary.courier}</span>
                                        </p>
                                        {orderSummary.address && (
                                            <p className="text-xs text-slate-500 flex items-start gap-1">
                                                <MapPin className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                                                <span>{orderSummary.address}</span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Kartu Item Belanja */}
                            <div className="rounded-2xl border-2 border-ink bg-[#EFEFE6] p-4 space-y-2">
                                <h3 className="text-sm font-black text-ink">Item Belanja</h3>
                                {orderSummary.items.map((item, index) => (
                                    <div key={index} className="text-xs text-slate-600">
                                        <span className="font-bold text-ink">{index + 1}. {item.name}</span>
                                        <div className="text-slate-500">
                                            {item.qty} x Rp {item.price.toLocaleString('id-ID')} = Rp {item.total.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* QR Code — konteks disesuaikan metode */}
                        <div className="rounded-2xl border-2 border-ink bg-white p-4 flex flex-col items-center gap-3 shadow-[3px_3px_0_#161616]">
                            <h3 className="text-sm font-black text-ink">QR Code Order</h3>
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="QR Code Order" className="w-32 h-32" />
                            ) : (
                                <div className="w-32 h-32 rounded-2xl bg-cream flex items-center justify-center text-xs text-slate-500">
                                    Memuat QR...
                                </div>
                            )}
                            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                                {isWalkIn
                                    ? '🏪 Tunjukkan QR Code ini ke Kasir saat mengambil barang.'
                                    : '📦 Scan oleh kurir saat serah terima barang.'
                                }
                            </p>
                        </div>
                    </div>

                    {/* ===== TOMBOL BAWAH ===== */}
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={handleDownloadInvoice}
                            disabled={downloadLoading}
                            className="inline-flex items-center justify-center gap-1.5 bg-ink hover:bg-slate-900 text-cream text-xs font-black py-3 px-2 rounded-xl border-2 border-ink shadow-[3px_3px_0_#161616] transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            <Download className="w-4 h-4 shrink-0" />
                            {downloadLoading ? 'Membuat...' : 'Download PDF'}
                        </button>
                        <button
                            onClick={handlePrintInvoice}
                            className="inline-flex items-center justify-center gap-1.5 bg-white border-2 border-ink text-ink text-xs font-black py-3 px-2 rounded-xl hover:bg-lime shadow-[3px_3px_0_#161616] transition-colors whitespace-nowrap"
                        >
                            <Printer className="w-4 h-4 shrink-0" />
                            Print Invoice
                        </button>
                        <button
                            onClick={() => window.location.href = '/catalog'}
                            className="inline-flex items-center justify-center gap-1.5 bg-white border-2 border-ink text-ink text-xs font-black py-3 px-2 rounded-xl hover:bg-lime shadow-[3px_3px_0_#161616] transition-colors whitespace-nowrap"
                        >
                            <ShoppingBag className="w-4 h-4 shrink-0" />
                            Belanja Lagi
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => window.location.href = '/catalog'}
                    className="mt-4 text-sm text-slate-600 hover:text-red-600 font-semibold underline transition-colors cursor-pointer block mx-auto"
                >
                    Kembali Belanja di Katalog
                </button>
            )}
        </div>
        </>
    );
}
