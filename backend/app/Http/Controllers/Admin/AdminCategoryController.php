<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCategoryController extends Controller
{
    public function index()
    {
        $categories = Category::query()
            ->leftJoin('products', function ($join) {
                $join->on('products.category_id', '=', 'categories.category_id')
                    ->orOn('products.category', '=', 'categories.name');
            })
            ->select('categories.category_id', 'categories.name', 'categories.icon', 'categories.is_active')
            ->selectRaw('count(distinct products.product_id) as total')
            ->groupBy('categories.category_id', 'categories.name', 'categories.icon', 'categories.is_active')
            ->orderBy('categories.name')
            ->get()
            ->map(fn ($category) => [
                'id'          => $category->category_id,
                'category_id' => $category->category_id,
                'name'        => $category->name,
                'icon'        => $category->icon,
                'is_active'   => (bool) $category->is_active,
                'count'       => (int) $category->total,
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:categories,name'],
            'icon' => ['nullable', 'string', 'max:10'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $category = Category::create([
            'name' => trim($data['name']),
            'icon' => $data['icon'] ?? '🏷️',
            'is_active' => $data['is_active'] ?? true,
        ]);
        return response()->json(['status' => 'success', 'data' => $category], 201);
    }

    public function update(Request $request, int $id)
    {
        $category = Category::findOrFail($id);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:categories,name,' . $id],
            'icon' => ['nullable', 'string', 'max:10'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $oldName = $category->name;
        $newName = trim($data['name']);
        DB::transaction(function () use ($category, $oldName, $newName, $data) {
            $category->update([
                'name' => $newName,
                'icon' => $data['icon'] ?? '🏷️',
                'is_active' => $data['is_active'] ?? true,
            ]);
            if ($oldName !== $newName) {
                Product::where('category_id', $category->category_id)->update(['category' => $newName]);
                Product::where('category', $oldName)->update([
                    'category'    => $newName,
                    'category_id' => $category->category_id,
                ]);
            }
        });
        return response()->json(['status' => 'success', 'data' => $category->fresh()]);
    }

    public function destroy(int $id)
    {
        $category = Category::findOrFail($id);
        if (Product::where('category_id', $category->category_id)->orWhere('category', $category->name)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kategori masih digunakan produk. Ubah kategori produk terlebih dahulu.',
            ], 422);
        }
        $category->delete();
        return response()->json(['status' => 'success']);
    }
}