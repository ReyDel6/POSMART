<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    use ValidatesRequests;

    public function update(Request $request)
    {
        $user = $request->user();

        $this->validate($request, [
            'name'    => 'required|string',
            'email'   => 'nullable|email|unique:users,email,' . $user->id,
            'phone'   => 'nullable|string',
            'address' => 'nullable|string',
        ], [
            'name.required'   => 'Nama wajib diisi.',
            'email.email'     => 'e-Mail tidak valid.',
            'email.unique'    => 'e-Mail sudah terdaftar.',
        ]);

        $name    = trim($request->input('name'));
        $email   = strtolower(trim($request->input('email', $user->email)));
        $phone   = trim($request->input('phone', ''));
        $address = trim($request->input('address', ''));

        if ($name === '') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nama wajib diisi.',
            ], 422);
        }

        if ($phone !== '' && strtolower($phone) !== strtolower($user->phone ?? '')) {
            $exists = User::where('phone', $phone)
                ->where('phone', '!=', $user->phone ?? '')
                ->exists();
            if ($exists) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Nomor telepon sudah terdaftar.',
                ], 400);
            }
        }

        $user->update([
            'name'    => $name,
            'email'   => $email,
            'phone'   => $phone,
            'address' => $address,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil berhasil diperbarui.',
            'user'    => [
                'id'      => $user->id,
                'name'    => $user->name,
                'email'   => $user->email,
                'phone'   => $user->phone,
                'address' => $user->address,
                'role'    => $user->role,
            ],
        ]);
    }
}