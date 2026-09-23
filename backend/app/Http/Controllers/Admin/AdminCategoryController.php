<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;

class AdminCategoryController extends Controller
{
    public function index()
    {
        $categories = Product::where('category', '!=', '')
            ->selectRaw('category as name, count(*) as total')
            ->groupBy('category')
            ->orderBy('category', 'asc')
            ->get()
            ->map(function ($c, $i) {
                return [
                    'id'    => $i + 1,
                    'name'  => $c->name,
                    'count' => (int) $c->total,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $categories,
        ]);
    }
}