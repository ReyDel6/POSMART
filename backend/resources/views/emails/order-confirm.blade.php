@extends('emails.layout')

@section('content')
    <p>Halo <strong>{{ $order->customer_name }}</strong>,</p>
    <p>Terima kasih! Pesanan kamu <strong>#{{ $order->id }}</strong> telah kami terima.</p>

    @if($isWalkIn)
        <p style="color:#059669;">Pembayaran <strong>tunai di kasir</strong> tercatat sudah lunas. Barang bisa langsung diambil/diserahkan.</p>
    @else
        <p style="color:#b45309;">Pembayaran <strong>online</strong> belum diterima. Segera selesaikan pembayaran agar pesanan diproses.</p>
        @if(!empty($store['whatsapp']))
            <p>Pembayaran via WhatsApp? Konfirmasi ke nomor berikut: <a href="https://wa.me/{{ $store['whatsapp'] }}">{{ $store['whatsapp'] }}</a></p>
        @endif
    @endif

    <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:16px;">
        <tr style="background:#f1f5f9;">
            <td style="padding:8px 12px;font-size:12px;font-weight:bold;color:#475569;">PRODUK</td>
            <td style="padding:8px 12px;font-size:12px;font-weight:bold;color:#475569;text-align:center;">QTY</td>
            <td style="padding:8px 12px;font-size:12px;font-weight:bold;color:#475569;text-align:right;">TOTAL</td>
        </tr>
        @foreach($items as $item)
            <tr style="border-top:1px solid #e2e8f0;">
                <td style="padding:8px 12px;">{{ $item['name'] }}</td>
                <td style="padding:8px 12px;text-align:center;">{{ $item['qty'] }}x</td>
                <td style="padding:8px 12px;text-align:right;">Rp {{ number_format($item['total'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
    </table>

    <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:12px;font-size:13px;">
        <tr>
            <td style="padding:4px 12px;color:#475569;">Subtotal</td>
            <td style="padding:4px 12px;text-align:right;">Rp {{ number_format(max(0, (int) $order->total_price - (int) $order->shipping_fee), 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td style="padding:4px 12px;color:#475569;">Ongkos Kirim</td>
            <td style="padding:4px 12px;text-align:right;">Rp {{ number_format((int) $order->shipping_fee, 0, ',', '.') }}</td>
        </tr>
        <tr style="border-top:2px solid #e2e8f0;">
            <td style="padding:8px 12px;font-weight:bold;">TOTAL</td>
            <td style="padding:8px 12px;text-align:right;font-weight:bold;">Rp {{ number_format((int) $order->total_price, 0, ',', '.') }}</td>
        </tr>
    </table>

    <p style="margin-top:24px;font-size:12px;color:#64748b;">
        Cek status pesanan kapan saja di menu <strong>Pesanan Saya</strong> pada aplikasi.
    </p>
@endsection