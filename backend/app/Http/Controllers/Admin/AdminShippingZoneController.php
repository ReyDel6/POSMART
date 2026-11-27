<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingZone;
use Illuminate\Http\Request;

class AdminShippingZoneController extends Controller
{
    public function index()
    {
        $zones = ShippingZone::orderBy('sort', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($z) {
                return [
                    'id'        => (int) $z->id,
                    'name'      => $z->name,
                    'coverage'  => $z->coverage,
                    'fee'       => (int) $z->fee,
                    'free_shipping_minimum' => $z->free_shipping_minimum !== null ? (int) $z->free_shipping_minimum : null,
                    'is_active' => (bool) $z->is_active,
                    'sort'      => (int) $z->sort,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $zones,
        ]);
    }

    public function store(Request $request)
    {
        $name = trim((string) $request->input('name', ''));
        $fee  = max(0, (int) $request->input('fee', 0));
        $minimum = trim((string) $request->input('free_shipping_minimum', ''));

        if ($name === '') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nama zona wajib diisi.',
            ], 422);
        }

        $zone = ShippingZone::create([
            'name'      => $name,
            'coverage'  => trim((string) $request->input('coverage', '')),
            'fee'       => $fee,
            'free_shipping_minimum' => $minimum !== '' ? max(1, (int) $minimum) : null,
            'is_active' => $request->boolean('is_active', true),
            'sort'      => max(0, (int) $request->input('sort', 0)),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Zona ongkir berhasil ditambahkan.',
            'data'    => ['id' => (int) $zone->id],
        ], 201);
    }

    public function update(Request $request)
    {
        $id   = (int) ($request->input('id') ?? 0);
        $name = trim((string) $request->input('name', ''));

        if ($name === '') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nama zona wajib diisi.',
            ], 422);
        }

        $zone = ShippingZone::find($id);
        if (!$zone) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Zona ongkir tidak ditemukan.',
            ], 404);
        }

        $zone->update([
            'name'      => $name,
            'coverage'  => trim((string) $request->input('coverage', '')),
            'fee'       => max(0, (int) $request->input('fee', 0)),
            'free_shipping_minimum' => ($request->input('free_shipping_minimum') !== null && $request->input('free_shipping_minimum') !== '') ? max(1, (int) $request->input('free_shipping_minimum')) : null,
            'is_active' => $request->boolean('is_active', $zone->is_active),
            'sort'      => max(0, (int) $request->input('sort', 0)),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Zona ongkir berhasil diperbarui.',
        ]);
    }

    public function destroy(Request $request)
    {
        $id = (int) $request->query('id', 0);

        $zone = ShippingZone::find($id);
        if (!$zone) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Zona ongkir tidak ditemukan.',
            ], 404);
        }

        $zone->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Zona ongkir berhasil dihapus.',
        ]);
    }
}