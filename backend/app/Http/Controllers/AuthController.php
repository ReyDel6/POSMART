<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ValidatesRequests;

    public function register(Request $request)
    {
        $this->validate($request, [
            'name'     => 'required|string',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'phone'    => 'nullable|string',
            'address'  => 'nullable|string',
        ], [
            'name.required'      => 'Nama wajib diisi.',
            'email.required'     => 'e-Mail wajib diisi.',
            'email.email'        => 'e-Mail tidak valid atau kosong.',
            'email.unique'       => 'e-Mail sudah terdaftar.',
            'password.required'  => 'Password wajib diisi.',
            'password.min'       => 'Password minimal harus 6 karakter.',
        ]);

        $phone = trim($request->input('phone', ''));

        if ($phone !== '') {
            $exists = User::where('phone', $phone)->exists();
            if ($exists) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Nomor telepon sudah terdaftar.',
                ], 400);
            }
        }

        User::create([
            'name'     => trim($request->input('name')),
            'email'    => strtolower(trim($request->input('email'))),
            'password' => $request->input('password'),
            'phone'    => $phone,
            'address'  => trim($request->input('address', '')),
            'role'     => 'user',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Registrasi berhasil! Silakan masuk ke akun Anda.',
        ], 201);
    }

    public function login(Request $request)
    {
        $this->validate($request, [
            'email'    => 'required|email',
            'password' => 'required',
        ], [
            'email.required'    => 'e-Mail dan Password wajib diisi.',
            'email.email'       => 'e-Mail dan Password wajib diisi.',
            'password.required' => 'e-Mail dan Password wajib diisi.',
        ]);

        $email    = strtolower(trim($request->input('email')));
        $password = $request->input('password');

        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'e-Mail tidak terdaftar.',
            ], 401);
        }

        if (!$user->password || !Hash::check($password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Password tidak sesuai',
            ], 401);
        }

        $token = $user->createToken('posmart')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'token'  => $token,
            'user'   => [
                'id'      => $user->id,
                'name'    => $user->name,
                'email'   => $user->email,
                'phone'   => $user->phone,
                'address' => $user->address,
                'role'    => $user->role,
            ],
        ]);
    }

    public function googleAuth(Request $request)
    {
        $this->validate($request, [
            'code' => 'required',
        ], [
            'code.required' => 'Authorization code dari Google tidak ditemukan.',
        ]);

        $clientId     = $request->input('client_id', config('services.google.client_id'));
        $clientSecret = $request->input('client_secret', config('services.google.client_secret'));
        $redirectUri  = 'postmessage';

        // Tahap 1: Tukar code dengan access token
        try {
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'code'          => $request->input('code'),
                'client_id'     => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri'  => $redirectUri,
                'grant_type'    => 'authorization_code',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Terjadi kesalahan otentikasi Google.',
            ], 500);
        }

        $tokenData = $tokenResponse->json();

        if (empty($tokenData['access_token'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mendapatkan Access Token dari Google.',
            ], 500);
        }

        // Tahap 2: Ambil profil pengguna
        try {
            $userInfoResponse = Http::get('https://www.googleapis.com/oauth2/v3/userinfo', [
                'access_token' => $tokenData['access_token'],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data profil dari Google.',
            ], 500);
        }

        $googleUser = $userInfoResponse->json();

        if (empty($googleUser['email'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data profil dari Google.',
            ], 500);
        }

        $googleId = $googleUser['sub'] ?? '';
        $email    = $googleUser['email'];
        $name     = $googleUser['name'] ?? 'Google User';

        if (empty($googleId)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mendapatkan Google ID (sub) dari Google.',
            ], 500);
        }

        // Tahap 3: Sinkronisasi dengan database
        $user = User::where('google_id', $googleId)->first();

        if (!$user) {
            $userOld = User::where('email', $email)->first();

            if ($userOld) {
                $userOld->update(['google_id' => $googleId]);
                $user = $userOld;
            } else {
                $user = User::create([
                    'google_id' => $googleId,
                    'name'      => $name,
                    'email'     => $email,
                    'password'  => Hash::make(Str::random(32)),
                    'role'      => 'cashier',
                ]);
            }
        }

        // Tahap 4: Terbitkan token
        $token = $user->createToken('posmart')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'token'  => $token,
            'user'   => [
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ]);
    }
}
