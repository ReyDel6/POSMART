<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ValidatesRequests;

    public function store(Request $request)
    {
        $this->validate($request, [
            'product_id' => 'required|integer',
            'rating'     => 'required|integer|between:1,5',
            'comment'    => 'nullable|string|max:500',
        ], [
            'product_id.required' => 'Produk wajib dipilih.',
            'product_id.integer'  => 'Produk tidak valid.',
            'rating.required'     => 'Nilai (rating) wajib diisi.',
            'rating.between'      => 'Rating harus antara 1 sampai 5.',
            'comment.max'         => 'Ulasan maksimal 500 karakter.',
        ]);

        $user     = $request->user();
        $productId = (int) $request->input('product_id');

        $product = Product::find($productId);
        if (!$product) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Produk tidak ditemukan.',
            ], 404);
        }

        // Hanya produk yang pernah dibeli oleh user ini yang boleh dinilai.
        $purchase = $user->orders()
            ->whereHas('items', function ($q) use ($productId) {
                $q->where('product_id', $productId);
            })
            ->where('payment_status', 'paid')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$purchase) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Hanya produk yang pernah Anda beli yang bisa dinilai.',
            ], 403);
        }

        $review = Review::updateOrCreate(
            [
                'user_id'    => $user->id,
                'product_id' => $productId,
            ],
            [
                'order_id' => $purchase->id,
                'rating'   => (int) $request->input('rating'),
                'comment'  => trim((string) $request->input('comment', '')),
            ]
        );

        if (!$review->created_at) {
            $review->forceFill(['created_at' => now()])->save();
        }

        // Rekap rating rata-rata ke kolom products.rating
        $product->update([
            'rating' => round(
                (float) Review::where('product_id', $productId)->avg('rating'),
                1
            ),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Terima kasih atas ulasan Anda!',
            'data'    => [
                'rating'  => $review->rating,
                'comment' => $review->comment,
            ],
        ]);
    }

    public function show(Request $request)
    {
        $productId = (int) $request->input('product_id', 0);

        if ($productId <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Produk tidak valid.',
            ], 422);
        }

        $user = $request->user();

        $reviews = Review::where('product_id', $productId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($r) use ($user) {
                return [
                    'id'          => $r->id,
                    'rating'      => $r->rating,
                    'comment'     => $r->comment,
                    'user_name'   => $r->user?->name ?? 'Pelanggan',
                    'is_mine'     => $user ? (int) $r->user_id === (int) $user->id : false,
                    'created_at'  => $r->created_at,
                ];
            });

        $myReview = $user
            ? Review::where('product_id', $productId)->where('user_id', $user->id)->first()
            : null;

        $product = Product::find($productId);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'product_id'   => $productId,
                'rating'       => $product ? (float) $product->rating : 0,
                'reviews_count'=> $reviews->count(),
                'my_rating'    => $myReview?->rating,
                'can_review'   => $this->canReview($user, $productId),
                'reviews'      => $reviews,
            ],
        ]);
    }

    private function canReview(?object $user, int $productId): bool
    {
        if (!$user) {
            return false;
        }

        return $user->orders()
            ->whereHas('items', function ($q) use ($productId) {
                $q->where('product_id', $productId);
            })
            ->where('payment_status', 'paid')
            ->exists();
    }
}