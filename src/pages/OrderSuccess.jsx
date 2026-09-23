// File: src/pages/OrderSuccess.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, Printer } from 'lucide-react';
import api from '../utils/api';
import QRCode from 'qrcode';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { useCartContext } from '../context/CartContext';

export default function OrderSuccess() {
    const { handleClearCart } = useCartContext();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [orderSummary] = useState(() => {
        const savedSummary = localStorage.getItem('last_order_summary');
        if (!savedSummary) return null;
        try {
            return JSON.parse(savedSummary);
        } catch {
            return null;
        }
    });
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [storeName, setStoreName] = useState('POSMart');

    useEffect(() => {
        // Pastikan keranjang belanja selalu dibersihkan saat masuk ke halaman OrderSuccess
        if (handleClearCart) handleClearCart();
        localStorage.removeItem('posmart');
    }, [handleClearCart]);

    useEffect(() => {
        let active = true;
        api.get('/public/settings.php')
            .then(res => {
                if (active && res.data && res.data.status === 'success' && res.data.data?.store_name) {
                    setStoreName(res.data.data.store_name);
                }
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!orderSummary) return;
        const qrData = `Order:${orderSummary.order_id}|Customer:${orderSummary.customer_id ?? 'N/A'}|Total:${orderSummary.total_price}`;
        QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', margin: 1, width: 150 })
            .then((url) => setQrCodeUrl(url))
            .catch((err) => console.error('Gagal membuat QR code:', err));
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

    const handlePrintInvoice = () => {
        window.print();
    };

    return (
        <>
        {/* ===== STRUK PRINT (hanya tampil saat print =====) */}
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
                        <div className="receipt-row"><span>{item.qty} x Rp {item.price.toLocaleString('id-ID')}</span><span>Rp {item.total.toLocaleString('id-ID')}</span></div>
                    </div>
                ))}
                <div className="receipt-line">------------------------------------</div>
                <div className="receipt-row"><span>Subtotal</span><span>Rp {orderSummary.subtotal.toLocaleString('id-ID')}</span></div>
                <div className="receipt-row"><span>Ongkir</span><span>Rp {orderSummary.shipping_fee.toLocaleString('id-ID')}</span></div>
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

        <div className="max-w-2xl mx-auto my-16 p-6 bg-white border border-slate-100 shadow-xl rounded-2xl text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-black text-slate-800">Pesanan Berhasil Dibuat!</h2>
            <p className="text-sm text-slate-500 mt-1">ID Transaksi Anda: <span className="font-mono font-bold text-slate-700">#{orderId}</span></p>

            {/* BADGE STATUS */}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Menunggu Pembayaran
                </span>
            </div>

            <hr className="my-6 border-slate-100" />

            {/* Detail Pesanan */}

            {orderSummary ? (
                <div className="text-left space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-6 items-start">
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="text-sm font-bold text-slate-900 mb-3">Detail Pesanan</h3>
                                <p className="text-xs text-slate-500">Order ID: <span className="font-mono text-slate-700">#{orderSummary.order_id}</span></p>
                                <p className="text-xs text-slate-500">Customer ID: <span className="font-mono text-slate-700">{orderSummary.customer_id ?? '-'}</span></p>
                                <p className="text-xs text-slate-500">Nama: <span className="text-slate-700">{orderSummary.customer_name}</span></p>
                                <p className="text-xs text-slate-500">Total: <span className="text-slate-700">Rp {orderSummary.total_price.toLocaleString('id-ID')}</span></p>
                            </div>

                            {/* Item Belanja */}

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                                <h3 className="text-sm font-bold text-slate-900">Item Belanja</h3>
                                {orderSummary.items.map((item, index) => (
                                    <div key={index} className="text-xs text-slate-600">
                                        <span className="font-semibold text-slate-800">{index + 1}. {item.name}</span>
                                        <div className="text-slate-500">
                                            {item.qty} x Rp {item.price.toLocaleString('id-ID')} = Rp {item.total.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* QR Code Order */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col items-center gap-3">
                            <h3 className="text-sm font-bold text-slate-900">QR Code Order</h3>
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="QR Code Order" className="w-32 h-32" />
                            ) : (
                                <div className="w-32 h-32 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">Memuat QR...</div>
                            )}
                            <p className="text-[11px] text-slate-500 text-center">Scan untuk verifikasi pesanan</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            onClick={handleDownloadInvoice}
                            disabled={downloadLoading}
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            {downloadLoading ? 'Membuat PDF...' : 'Download Invoice PDF'}
                        </button>
                        <button
                            onClick={handlePrintInvoice}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            Print Invoice
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="text-sm text-slate-600 hover:text-red-600 font-semibold underline transition-colors"
                        >
                            Kembali Belanja di Katalog
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => window.location.href = '/'}
                    className="mt-4 text-sm text-slate-600 hover:text-red-600 font-semibold underline transition-colors cursor-pointer block mx-auto"
                >
                    Kembali Belanja di Katalog
                </button>
            )}
        </div>
        </>
    );
}