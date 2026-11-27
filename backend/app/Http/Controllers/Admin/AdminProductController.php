<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    public function index()
    {
        $products = Product::orderBy('product_id', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data'   => $products,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->all();

        $barcode = trim($data['barcode'] ?? '');
        if ($barcode === '') {
            $barcode = 'POS' . now()->format('ymdHis') . random_int(100, 999);
        }

        $image = !empty($data['image']) ? $data['image'] : 'default_product.jpeg';
        [$categoryId, $categoryName] = $this->resolveCategory($data);

        Product::create([
            'barcode'        => $barcode,
            'name'           => $data['name'],
            'price'          => $data['price'],
            'purchase_price' => max(0, (int) ($data['purchase_price'] ?? 0)),
            'category_id'    => $categoryId,
            'category'       => $categoryName,
            'stock'          => $data['stock'],
            'image'          => $image,
            'is_promo'       => filter_var($data['is_promo'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'promo'          => max(0, min(90, (int) ($data['promo'] ?? 0))),
            'description'    => trim((string) ($data['description'] ?? '')),
            'gallery'        => $this->sanitizeGallery($data['gallery'] ?? []),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Produk berhasil ditambahkan',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->all();
        $image = !empty($data['image']) ? $data['image'] : 'default_product.jpeg';
        [$categoryId, $categoryName] = $this->resolveCategory($data);

        $productId = $data['product_id'] ?? $data['id'] ?? 0;
        Product::where('product_id', $productId)->update([
            'barcode'        => $data['barcode'],
            'name'           => $data['name'],
            'price'          => $data['price'],
            'purchase_price' => max(0, (int) ($data['purchase_price'] ?? 0)),
            'category_id'    => $categoryId,
            'category'       => $categoryName,
            'stock'          => $data['stock'],
            'image'          => $image,
            'is_promo'       => filter_var($data['is_promo'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'promo'          => max(0, min(90, (int) ($data['promo'] ?? 0))),
            'description'    => trim((string) ($data['description'] ?? '')),
            'gallery'        => $this->sanitizeGallery($data['gallery'] ?? []),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Produk berhasil diperbarui',
        ]);
    }

    private function resolveCategory(array $data): array
    {
        $categoryId = !empty($data['category_id']) ? (int) $data['category_id'] : null;
        $categoryName = trim((string) ($data['category'] ?? ''));

        if (!$categoryId && $categoryName !== '') {
            $cat = \App\Models\Category::firstOrCreate(
                ['name' => $categoryName],
                ['icon' => '🏷️', 'is_active' => true]
            );
            $categoryId = $cat->id;
        } elseif ($categoryId && $categoryName === '') {
            $categoryName = \App\Models\Category::find($categoryId)?->name ?? '';
        }

        return [$categoryId, $categoryName];
    }

    private function sanitizeGallery($gallery): ?array
    {
        $items = [];
        foreach ((array) $gallery as $name) {
            $name = trim((string) $name);
            if ($name !== '' && str_contains($name, '.') && !str_starts_with($name, '/')) {
                $items[] = $name;
            }
        }
        $items = array_values(array_unique(array_slice($items, 0, 8)));

        return $items === [] ? null : $items;
    }

    public function destroy(Request $request)
    {
        $ids = $request->input('ids');
        if (is_array($ids)) {
            $ids = array_values(array_filter(array_map('intval', $ids)));
            Product::whereIn('product_id', $ids)->delete();

            return response()->json([
                'status'  => 'success',
                'message' => 'Produk terpilih berhasil dihapus',
            ]);
        }

        $id = (int) $request->query('id', 0);
        Product::where('product_id', $id)->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Produk berhasil dihapus',
        ]);
    }

    public function restock(Request $request)
    {
        $id = (int) $request->input('id');
        $quantity = (int) $request->input('quantity');
        if ($quantity < 1) {
            return response()->json(['status' => 'error', 'message' => 'Jumlah restock harus lebih dari 0.'], 422);
        }

        $product = Product::find($id);
        if (!$product) {
            return response()->json(['status' => 'error', 'message' => 'Produk tidak ditemukan.'], 404);
        }

        $product->increment('stock', $quantity);
        return response()->json(['status' => 'success', 'message' => "Stok {$product->name} ditambah {$quantity} pcs.", 'stock' => $product->fresh()->stock]);
    }
}
