<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Promotion;
use App\Services\PromotionService;
use Illuminate\Http\Request;

class AdminPromotionController extends Controller
{
    public function index()
    {
        $promotions = Promotion::orderBy('id', 'desc')->get();

        $productNames = Product::whereIn('id', array_values(array_filter(array_unique($promotions->pluck('product_id')->all()))))
            ->pluck('name', 'id');

        $data = $promotions->map(function (Promotion $p) use ($productNames) {
            return [
                'id'           => (int) $p->id,
                'name'         => $p->name,
                'type'         => $p->type,
                'product_id'   => (int) $p->product_id,
                'product_name' => $productNames[$p->product_id] ?? null,
                'buy_qty'      => (int) $p->buy_qty,
                'free_qty'     => (int) $p->free_qty,
                'tiers'        => array_values((array) $p->tiers),
                'items'        => array_values((array) $p->items),
                'bundle_price' => (int) $p->bundle_price,
                'active'       => (bool) $p->active,
                'starts_at'    => $p->starts_at?->format('Y-m-d\\TH:i'),
                'ends_at'      => $p->ends_at?->format('Y-m-d\\TH:i'),
                'created_at'   => $p->created_at?->format('Y-m-d H:i'),
            ];
        })->values();

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $promo = $this->normalize($data);
        if ($promo instanceof \Illuminate\Http\JsonResponse) {
            return $promo;
        }

        Promotion::create($promo);

        return response()->json([
            'status'  => 'success',
            'message' => 'Promo berhasil ditambahkan',
        ], 201);
    }

    public function destroy(Request $request)
    {
        $id = (int) $request->query('id', 0);
        Promotion::where('id', $id)->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Promo berhasil dihapus',
        ]);
    }

    private function normalize(array $data)
    {
        $name   = trim((string) ($data['name'] ?? ''));
        $type   = (string) ($data['type'] ?? '');
        $active = filter_var($data['active'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $starts = trim((string) ($data['starts_at'] ?? ''));
        $ends   = trim((string) ($data['ends_at'] ?? ''));

        if ($name === '' || !in_array($type, ['block', 'b1g1', 'bundle'], true)) {
            return response()->json(['status' => 'error', 'message' => 'Nama dan tipe promo wajib diisi.'], 422);
        }

        $promo = [
            'name'         => $name,
            'type'         => $type,
            'active'       => $active,
            'starts_at'    => $starts !== '' ? $starts : null,
            'ends_at'      => $ends !== '' ? $ends : null,
            'product_id'   => null,
            'buy_qty'      => null,
            'free_qty'     => null,
            'tiers'        => null,
            'items'        => null,
            'bundle_price' => null,
        ];

        if ($type === 'block') {
            $productId = (int) ($data['product_id'] ?? 0);
            $tiers     = array_values(array_filter((array) ($data['tiers'] ?? []), fn ($t) => (int) ($t['min_qty'] ?? 0) > 0));
            $tiers     = array_map(fn ($t) => [
                'min_qty' => (int) $t['min_qty'],
                'percent' => max(1, min(90, (int) ($t['percent'] ?? 0))),
            ], array_slice($tiers, 0, 8));

            if ($productId <= 0 || $tiers === []) {
                return response()->json(['status' => 'error', 'message' => 'Promo blok butuh produk & minimal satu jenjang (min_qty + persen).'], 422);
            }
            $promo['product_id'] = $productId;
            $promo['tiers']      = $tiers;
        }

        if ($type === 'b1g1') {
            $productId = (int) ($data['product_id'] ?? 0);
            $buy       = max(1, (int) ($data['buy_qty'] ?? 0));
            $free      = max(1, (int) ($data['free_qty'] ?? 0));

            if ($productId <= 0) {
                return response()->json(['status' => 'error', 'message' => 'Promo B1G1 butuh produk.'], 422);
            }
            $promo['product_id'] = $productId;
            $promo['buy_qty']    = $buy;
            $promo['free_qty']   = $free;
        }

        if ($type === 'bundle') {
            $items = array_values(array_filter((array) ($data['items'] ?? []), fn ($i) => (int) ($i['product_id'] ?? 0) > 0));
            $items = array_map(fn ($i) => [
                'product_id' => (int) $i['product_id'],
                'qty'        => max(1, (int) ($i['qty'] ?? 1)),
            ], array_slice($items, 0, 20));
            $bundlePrice = (int) ($data['bundle_price'] ?? 0);

            if ($items === [] || $bundlePrice <= 0) {
                return response()->json(['status' => 'error', 'message' => 'Paket (bundle) butuh isi produk & harga paket.'], 422);
            }
            $promo['items']        = $items;
            $promo['bundle_price'] = $bundlePrice;
        }

        return $promo;
    }

    public function update(Request $request)
    {
        $id   = (int) ($request->input('id') ?? 0);
        $promo = Promotion::find($id);
        if (!$promo) {
            return response()->json(['status' => 'error', 'message' => 'Promo tidak ditemukan.'], 404);
        }

        $data  = $request->all();
        $normalized = $this->normalize($data);
        if ($normalized instanceof \Illuminate\Http\JsonResponse) {
            return $normalized;
        }

        $promo->update($normalized);

        return response()->json([
            'status'  => 'success',
            'message' => 'Promo berhasil diperbarui',
        ]);
    }
}