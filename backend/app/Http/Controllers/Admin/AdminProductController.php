<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    public function index()
    {
        $products = Product::orderBy('id', 'desc')->get();

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

        Product::create([
            'barcode'     => $barcode,
            'name'        => $data['name'],
            'price'       => $data['price'],
            'category'    => $data['category'],
            'stock'       => $data['stock'],
            'image'       => $image,
            'description' => trim((string) ($data['description'] ?? '')),
            'gallery'     => $this->sanitizeGallery($data['gallery'] ?? []),
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

        Product::where('id', $data['id'])->update([
            'barcode'     => $data['barcode'],
            'name'        => $data['name'],
            'price'       => $data['price'],
            'category'    => $data['category'],
            'stock'       => $data['stock'],
            'image'       => $image,
            'description' => trim((string) ($data['description'] ?? '')),
            'gallery'     => $this->sanitizeGallery($data['gallery'] ?? []),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Produk berhasil diperbarui',
        ]);
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
        $id = (int) $request->query('id', 0);

        Product::where('id', $id)->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Produk berhasil dihapus',
        ]);
    }
}
