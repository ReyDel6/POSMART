<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    use ValidatesRequests;

    private const TOKEN_TTL_MINUTES = 60;

    public function forgot(Request $request)
    {
        $this->validate($request, [
            'email' => 'required|email',
        ], [
            'email.required' => 'e-Mail wajib diisi.',
            'email.email'    => 'Format e-Mail tidak valid.',
        ]);

        $email = strtolower(trim($request->input('email')));
        $user  = User::where('email', $email)->first();

        // Selalu balas sukses agar email orang lain tidak terbocorkan.
        if (!$user) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Jika e-Mail terdaftar, link reset password akan dikirim.',
            ]);
        }

        if (!$user->password) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun ini masuk via Google dan tidak memiliki password. Silakan gunakan tombol Masuk dengan Google.',
            ], 422);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            ['token' => $token, 'created_at' => now()]
        );

        // Mode demo: SMTP tidak dikonfigurasi, token dikembalikan agar bisa langsung dipakai
        // dari halaman reset. Di produksi, ganti dengan pengiriman e-Mail nyata.
        return response()->json([
            'status'  => 'success',
            'message' => 'Link reset password telah dibuat.',
            'token'   => $token,
        ]);
    }

    public function reset(Request $request)
    {
        $this->validate($request, [
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => 'required|min:6',
        ], [
            'email.required'     => 'e-Mail wajib diisi.',
            'email.email'        => 'Format e-Mail tidak valid.',
            'token.required'     => 'Token reset wajib diisi.',
            'password.required'  => 'Password baru wajib diisi.',
            'password.min'       => 'Password baru minimal 6 karakter.',
        ]);

        $email = strtolower(trim($request->input('email')));

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->where('token', $request->input('token'))
            ->first();

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token reset tidak valid.',
            ], 422);
        }

        if (strtotime($record->created_at) < now()->subMinutes(self::TOKEN_TTL_MINUTES)->getTimestamp()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return response()->json([
                'status'  => 'error',
                'message' => 'Token reset sudah kedaluwarsa. Silakan minta ulang.',
            ], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user || !$user->password) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun tidak ditemukan atau tidak memakai password.',
            ], 422);
        }

        $user->update(['password' => $request->input('password')]);

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Password berhasil diubah. Silakan masuk dengan password baru.',
        ]);
    }
}