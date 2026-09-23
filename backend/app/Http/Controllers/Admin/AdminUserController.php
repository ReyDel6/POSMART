<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    private const ROLES = ['user', 'cashier', 'admin', 'owner'];

    public function index()
    {
        $users = User::select('id', 'name', 'email', 'phone', 'address', 'role', 'created_at')
            ->orderByRaw("FIELD(role, 'owner', 'admin', 'cashier', 'user')")
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $users,
        ]);
    }

    public function store(Request $request)
    {
        $data   = $request->all();
        $name   = trim($data['name'] ?? '');
        $email  = strtolower(trim($data['email'] ?? ''));
        $pass   = (string) ($data['password'] ?? '');
        $role   = $data['role'] ?? 'cashier';

        if ($name === '' || $email === '' || $pass === '') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nama, e-Mail, dan password wajib diisi.',
            ], 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Format e-Mail tidak valid.',
            ], 422);
        }

        if (strlen($pass) < 6) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Password minimal harus 6 karakter.',
            ], 422);
        }

        if (!in_array($role, self::ROLES, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Hak akses (role) tidak valid.',
            ], 422);
        }

        if (User::where('email', $email)->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'e-Mail sudah terdaftar.',
            ], 400);
        }

        $user = User::create([
            'name'    => $name,
            'email'   => $email,
            'password'=> $pass,
            'phone'   => trim($data['phone'] ?? ''),
            'address' => trim($data['address'] ?? ''),
            'role'    => $role,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Staf berhasil ditambahkan.',
            'user'    => ['id' => $user->id],
        ], 201);
    }

    public function update(Request $request)
    {
        $data = $request->all();
        $id   = (int) ($data['id'] ?? 0);

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Pengguna tidak ditemukan.',
            ], 404);
        }

        $name = trim($data['name'] ?? $user->name);
        $role = $data['role'] ?? $user->role;

        if ($name === '') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nama wajib diisi.',
            ], 422);
        }

        if (!in_array($role, self::ROLES, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Hak akses (role) tidak valid.',
            ], 422);
        }

        // Jangan izinkan admin mencabut hak akses admin/owner pada akunnya sendiri
        if ($user->id === $request->user()->id && !in_array($role, ['admin', 'owner'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Anda tidak dapat menghapus hak akses admin/owner pada akun sendiri.',
            ], 403);
        }

        $payload = [
            'name'    => $name,
            'phone'   => trim($data['phone'] ?? $user->phone ?? ''),
            'address' => trim($data['address'] ?? $user->address ?? ''),
            'role'    => $role,
        ];

        if (isset($data['email']) && strtolower(trim($data['email'])) !== $user->email) {
            $email = strtolower(trim($data['email']));
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Format e-Mail tidak valid.',
                ], 422);
            }
            if (User::where('email', $email)->where('id', '!=', $id)->exists()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'e-Mail sudah terdaftar.',
                ], 400);
            }
            $payload['email'] = $email;
        }

        if (!empty($data['password'])) {
            if (strlen($data['password']) < 6) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Password minimal harus 6 karakter.',
                ], 422);
            }
            $payload['password'] = $data['password'];
        }

        $user->update($payload);

        return response()->json([
            'status'  => 'success',
            'message' => 'Data staf berhasil diperbarui.',
        ]);
    }

    public function destroy(Request $request)
    {
        $id   = (int) $request->query('id', 0);
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Pengguna tidak ditemukan.',
            ], 404);
        }

        if ($user->id === $request->user()->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Anda tidak dapat menghapus akun sendiri.',
            ], 403);
        }

        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tidak dapat menghapus administrator terakhir.',
            ], 403);
        }

        if ($user->role === 'owner' && User::where('role', 'owner')->count() <= 1) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tidak dapat menghapus owner/pemilik terakhir.',
            ], 403);
        }

        if ($user->orders()->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Pengguna memiliki riwayat transaksi. Hapus dibatalkan demi menjaga data transaksi.',
            ], 400);
        }

        $user->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Staf berhasil dihapus.',
        ]);
    }
}