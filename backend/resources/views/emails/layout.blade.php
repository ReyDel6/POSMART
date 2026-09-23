<table role="presentation" width="100%" style="background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <tr>
        <td align="center">
            <div style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                <div style="background:#059669;padding:26px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;">{{ $store['store_name'] ?? 'POSMart' }}</h1>
                    @if(!empty($store['store_address']))
                        <p style="margin:6px 0 0;color:#d1fae5;font-size:12px;">{{ $store['store_address'] }}</p>
                    @endif
                </div>
                <div style="padding:32px;font-size:14px;line-height:1.7;color:#1f2937;">
                    @yield('content')
                </div>
                <div style="background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#64748b;">
                    @if(!empty($store['store_phone'])) Telp/WA: {{ $store['store_phone'] }}<br />@endif
                    Terima kasih telah berbelanja di {{ $store['store_name'] ?? 'toko kami' }}.
                </div>
            </div>
        </td>
    </tr>
</table>