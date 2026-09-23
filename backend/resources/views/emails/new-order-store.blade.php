@extends('emails.layout')

@section('content')
    <p>Ada pesanan baruu masuk: <strong>#{{ $order->id }}</strong></p>

    <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:8px;font-size:13px;">
        <tr><td style="padding:4px 0;color:#475569;width:140px;">Pelanggan</td><td style="padding:4px 0;"><strong>{{ $order->customer_name }}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#475569;">WhatsApp</td><td style="padding:4px 0;">{{ $order->phone }}</td></tr>
        <tr><td style="padding:4px 0;color:#475569;">Pengiriman</td><td style="padding:4px 0;">{{ $order->courier ?: 'Walk-in' }}</td></tr>
        <tr><td style="padding:4px 0;color:#475569;">Alamat</td><td style="padding:4px 0;">{{ $order->address }}</td></tr>
        <tr><td style="padding:4px 0;color:#475569;">Pembayaran</td><td style="padding:4px 0;">{{ $order->payment_mode === 'cash' ? 'Tunai di kasir (sudah lunas)' : 'Online (belum bayar)' }}</td></tr>
    </table>

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

    <p style="margin-top:16px;font-size:15px;font-weight:bold;">
        Total: Rp {{ number_format((int) $order->total_price, 0, ',', '.') }}
    </p>
@endsection