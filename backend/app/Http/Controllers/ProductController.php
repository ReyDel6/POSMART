<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        // Detail produk (dipakai halaman /product/:id)
        $detailId = (int) $request->input('id', 0);
        if ($detailId > 0) {
            return $this->show($request, $detailId);
        }

        // Kategori
        if ($request->has('categories') && $request->integer('categories') === 1) {
            $categories = Product::where('category', '!=', '')
                ->select('category')
                ->distinct()
                ->orderBy('category', 'asc')
                ->pluck('category');

            return response()->json([
                'status' => 'success',
                'data'   => $categories,
            ]);
        }

        $page  = max(1, (int) $request->input('page', 1));
        $limit = max(1, (int) $request->input('per_page', 6));
        $offset = ($page - 1) * $limit;

        $search   = trim($request->input('search', ''));
        $category = trim($request->input('category', 'All'));

        $query = Product::query();

        if ($search !== '') {
            $query->where('name', 'LIKE', "%$search%");
        }
        if ($category !== '' && $category !== 'All') {
            $query->where('category', $category);
        }

        $total = (clone $query)->count();

        $products = (clone $query)
            ->withCount('reviews')
            ->orderBy('created_at', 'desc')
            ->skip($offset)
            ->take($limit)
            ->get()
            ->map(function ($p) {
                return $this->cardPayload($p);
            });

        return response()->json([
            'status'     => 'success',
            'data'       => $products,
            'pagination' => [
                'page'       => $page,
                'limit'      => $limit,
                'total'      => $total,
                'totalPages' => max(1, (int) ceil($total / $limit)),
            ],
        ]);
    }

    public function show(Request $request, int $productId)
    {
        $product = Product::withCount('reviews')->find($productId);

        if (!$product) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Produk tidak ditemukan.',
            ], 404);
        }

        $user = $request->user();

        $reviews = Review::where('product_id', $productId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($r) use ($user) {
                return [
                    'id'         => $r->id,
                    'rating'     => $r->rating,
                    'comment'    => $r->comment,
                    'user_name'  => $r->user?->name ?? 'Pelanggan',
                    'is_mine'    => $user ? (int) $r->user_id === (int) $user->id : false,
                    'created_at' => $r->created_at,
                ];
            });

        $myReview = $user
            ? Review::where('product_id', $productId)->where('user_id', $user->id)->first()
            : null;

        $data             = $this->cardPayload($product);
        $data['description']  = $product->description ?? '';
        $data['gallery']      = $this->galleryUrls($product->gallery);
        $data['reviews']      = $reviews;
        $data['my_rating']    = $myReview?->rating;
        $data['can_review']   = $this->canReview($user, $productId);

        return response()->json([
            'status' => 'success',
            'data'   => $data,
        ]);
    }

    private function cardPayload(Product $p): array
    {
        return [
            'id'            => (int) $p->id,
            'barcode'       => $p->barcode,
            'name'          => $p->name,
            'price'         => (int) $p->price,
            'category'      => $p->category,
            'rating'        => (float) $p->rating,
            'stock'         => (int) $p->stock,
            'is_promo'      => (bool) $p->is_promo,
            'promo'         => (int) $p->promo,
            'image'         => '/product/' . $p->image,
            'reviews_count' => (int) $p->reviews_count,
        ];
    }

    private function galleryUrls(?array $gallery): array
    {
        $urls = [];
        foreach ((array) $gallery as $name) {
            $name = trim((string) $name);
            if ($name === '') {
                continue;
            }
            $urls[] = (str_starts_with($name, 'http') || str_starts_with($name, '/'))
                ? $name
                : '/product/' . $name;
        }
        return array_values(array_unique($urls));
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