@extends('emails.layout')

@section('content')
    <p>Halo <strong>{{ $order->customer_name }}</strong>,</p>
    <p style="color:#059669;">Pembayaran untuk pesanan <strong>#{{ $order->id }}</strong> telah kami terima. ✅</p>
    <p>Total yang dibayar: <strong style="font-size:16px;">Rp {{ number_format((int) $order->total_price, 0, ',', '.') }}</strong></p>
    <p>Pesanan kamu akan segera diproses oleh toko. Pantau perkembangannya di menu <strong>Pesanan Saya</strong>.</p>

    @if(!empty($store['whatsapp']))
        <p>Butuh bantuan? Hubungi kami di WhatsApp: <a href="https://wa.me/{{ $store['whatsapp'] }}">{{ $store['whatsapp'] }}</a></p>
    @endif
@endsection