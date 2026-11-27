<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminUploadController extends Controller
{
    public function store(Request $request)
    {
        if (!$request->hasFile('image') || !$request->file('image')->isValid()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tidak ada file gambar yang diunggah atau terjadi kesalahan upload.',
            ], 400);
        }

        $file = $request->file('image');
        $allowedTypes = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
        ];
        $maxSize = 5 * 1024 * 1024; // 5MB

        // MIME diambil dari isi file yang sebenarnya (bukan Content-Type dari client)
        $mime = strtolower((string) $file->getMimeType());
        $clientExt = strtolower($file->getClientOriginalExtension());

        if (!isset($allowedTypes[$mime])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Format file tidak didukung. Harap upload file gambar (JPG, PNG, WEBP, GIF).',
            ], 400);
        }

        if (!in_array($clientExt, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ekstensi file tidak didukung. Harap upload file gambar (JPG, PNG, WEBP, GIF).',
            ], 400);
        }

        if ($file->getSize() > $maxSize) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ukuran file terlalu besar. Maksimal 5MB.',
            ], 400);
        }

        // Ekstensi final SELALU diambil dari tabel whitelist MIME, bukan dari nama file client
        $newFileName = 'product_' . time() . '_' . uniqid() . '.' . $allowedTypes[$mime];

        // Path penyimpanan di public/product frontend (folder induk dari backend Laravel)
        // Karena gambar disajikan oleh Vite dari C:\POS\public\product
        $frontendPublic = dirname(base_path()) . '/public';
        $targetDir = $frontendPublic . '/product';
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        try {
            $file->move($targetDir, $newFileName);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan file gambar ke server.',
            ], 500);
        }

        // Duplikasi ke dist/product jika folder dist ada (untuk lingkungan produksi)
        $distDir = dirname(base_path()) . '/dist/product';
        if (is_dir(dirname($distDir))) {
            if (!is_dir($distDir)) {
                mkdir($distDir, 0755, true);
            }
            copy($targetDir . '/' . $newFileName, $distDir . '/' . $newFileName);
        }

        return response()->json([
            'status'     => 'success',
            'message'    => 'Gambar berhasil diunggah',
            'image_name' => $newFileName,
            'image_url'  => '/product/' . $newFileName,
        ]);
    }

    public function logo(Request $request)
    {
        if (!$request->hasFile('logo') || !$request->file('logo')->isValid()) {
            return response()->json(['status' => 'error', 'message' => 'File logo tidak valid.'], 400);
        }
        $file = $request->file('logo');
        $mime = strtolower((string) $file->getMimeType());
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime]) || $file->getSize() > 2 * 1024 * 1024) {
            return response()->json(['status' => 'error', 'message' => 'Logo harus JPG, PNG, atau WEBP maksimal 2MB.'], 400);
        }
        $name = 'store_logo_' . time() . '_' . uniqid() . '.' . $extensions[$mime];
        $dir = dirname(base_path()) . '/public/store';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        try {
            $file->move($dir, $name);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => 'Gagal menyimpan logo.'], 500);
        }

        // Duplikasi ke dist/store jika folder dist ada (untuk lingkungan produksi)
        $distDir = dirname(base_path()) . '/dist/store';
        if (is_dir(dirname($distDir))) {
            if (!is_dir($distDir)) {
                mkdir($distDir, 0755, true);
            }
            copy($dir . '/' . $name, $distDir . '/' . $name);
        }

        $url = '/store/' . $name;
        \App\Models\Setting::updateOrCreate(['key' => 'store_logo'], ['value' => $url]);
        return response()->json(['status' => 'success', 'image_url' => $url]);
    }
}
