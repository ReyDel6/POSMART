<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
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
            ->orderBy('created_at', 'desc')
            ->skip($offset)
            ->take($limit)
            ->get()
            ->map(function ($p) {
                return [
                    'id'       => (int) $p->id,
                    'barcode'  => $p->barcode,
                    'name'     => $p->name,
                    'price'    => (int) $p->price,
                    'category' => $p->category,
                    'rating'   => (float) $p->rating,
                    'stock'    => (int) $p->stock,
                    'is_promo' => (bool) $p->is_promo,
                    'promo'    => (int) $p->promo,
                    'image'    => '/product/' . $p->image,
                ];
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
}
