@extends('emails.layout')

@section('content')
    <p>Halo,</p>
    <p>Kamu (atau seseorang) baru saja meminta <strong>pengaturan ulang password</strong> akun kamu di
        <strong>{{ $storeName }}</strong>.</p>

    <p style="text-align:center;margin:28px 0;">
        <a href="{{ $resetUrl }}"
           style="background:#059669;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">
            Atur Ulang Password
        </a>
    </p>

    <p style="font-size:12px;color:#64748b;">
        Link ini berlaku <strong>60 menit</strong>. Jika kamu tidak memintanya, abaikan e-mail ini.
    </p>
    <p style="font-size:12px;color:#64748b;">
        Atau salin kode berikut untuk digunakan di halaman reset:
        <br /><code style="display:inline-block;margin-top:6px;padding:8px 12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;color:#0f172a;word-break:break-all;">{{ $token }}</code>
    </p>
@endsection