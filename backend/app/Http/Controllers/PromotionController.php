<?php

namespace App\Http\Controllers;

use App\Services\PromotionService;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    /**
     * Daftar promo aktif (publik) untuk katalog & keranjang:
     *   data.deals   -> promo produk (block / b1g1)
     *   data.bundles -> paket combo (bundle)
     */
    public function index(Request $request)
    {
        $svc     = app(PromotionService::class);

        $deals = $svc->activeDeals()->map(function ($d) use ($svc) {
            /** @var \App\Models\Promotion $d */
            $product = \App\Models\Product::where('id', $d->product_id)->first();

            return [
                'id'           => (int) $d->id,
                'type'         => $d->type,
                'name'         => $d->name,
                'label'        => $svc->label($d),
                'product_id'   => (int) $d->product_id,
                'product_name' => $product?->name ?? 'Produk tidak ditemukan',
                'product_image'=> $product ? '/product/' . $product->image : null,
                'buy_qty'      => (int) $d->buy_qty,
                'free_qty'     => (int) $d->free_qty,
                'tiers'        => array_values((array) $d->tiers),
            ];
        })->values();

        $bundles = $svc->activeBundles()->map(function ($b) use ($svc) {
            return $svc->bundlePayload($b);
        })->values();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'deals'   => $deals,
                'bundles' => $bundles,
            ],
        ]);
    }
}