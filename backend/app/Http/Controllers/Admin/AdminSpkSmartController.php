<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminSpkSmartController extends Controller
{
    private const DEFAULT_WEIGHTS = [
        'c1_stock' => [
            'code'   => 'C1',
            'name'   => 'Stok Barang',
            'type'   => 'cost', // Makin sedikit stok, prioritas makin tinggi
            'weight' => 40,
            'desc'   => 'Kriteria Cost: Sisa stok fisik di toko/gudang.',
        ],
        'c2_sales' => [
            'code'   => 'C2',
            'name'   => 'Tingkat Penjualan',
            'type'   => 'benefit', // Makin laris, prioritas makin tinggi
            'weight' => 35,
            'desc'   => 'Kriteria Benefit: Total kuantitas barang terjual dalam periode terpilih.',
        ],
        'c3_price' => [
            'code'   => 'C3',
            'name'   => 'Harga & Nilai Ekonomi',
            'type'   => 'benefit', // Potensi perputaran modal
            'weight' => 25,
            'desc'   => 'Kriteria Benefit: Harga jual / perputaran omzet produk.',
        ],
    ];

    /**
     * Mengambil bobot kriteria yang tersimpan
     */
    private function getWeights(): array
    {
        $setting = Setting::where('key', 'spk_smart_weights')->first();
        if (!$setting || empty($setting->value)) {
            return self::DEFAULT_WEIGHTS;
        }

        $saved = json_decode($setting->value, true);
        if (!is_array($saved)) {
            return self::DEFAULT_WEIGHTS;
        }

        $weights = self::DEFAULT_WEIGHTS;
        foreach ($weights as $k => $v) {
            if (isset($saved[$k]['weight'])) {
                $weights[$k]['weight'] = max(1, min(100, (int) $saved[$k]['weight']));
            } elseif (isset($saved[$k]) && is_numeric($saved[$k])) {
                $weights[$k]['weight'] = max(1, min(100, (int) $saved[$k]));
            }
        }

        return $weights;
    }

    /**
     * Tampilkan data analisis SMART lengkap
     */
    public function index(Request $request)
    {
        try {
            $days = min(365, max(1, (int) $request->input('days', 30)));
            $weightsData = $this->getWeights();

            // 1. Hitung Normalisasi Bobot Kriteria (Wj = wj / sum(w))
            $totalRawWeight = array_sum(array_column($weightsData, 'weight'));
            $totalRawWeight = max(1, $totalRawWeight);

            $criteria = [];
            foreach ($weightsData as $k => $c) {
                $normalized = round($c['weight'] / $totalRawWeight, 4);
                $criteria[$k] = array_merge($c, [
                    'raw_weight'        => (int) $c['weight'],
                    'normalized_weight' => $normalized,
                    'weight_percent'    => round($normalized * 100, 1),
                ]);
            }

            // 2. Kumpulkan data penjualan (periode $days hari terakhir)
            // Query murni menggunakan kolom order_id yang valid
            $since = now()->subDays($days);
            $salesData = DB::table('order_items as oi')
                ->join('orders as o', 'oi.order_id', '=', 'o.order_id')
                ->where(function ($w) {
                    $w->where('o.payment_status', 'paid')
                        ->orWhere('o.status', 'completed');
                })
                ->where('o.created_at', '>=', $since)
                ->select('oi.product_id', DB::raw('SUM(oi.qty) as total_sold'))
                ->groupBy('oi.product_id')
                ->pluck('total_sold', 'oi.product_id')
                ->toArray();

            // 3. Ambil semua produk sebagai alternatif
            $products = Product::orderBy('name', 'asc')->get();

            if ($products->isEmpty()) {
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Belum ada produk terdaftar untuk dihitung.',
                    'data'    => [
                        'criteria'       => array_values($criteria),
                        'total_weight'   => $totalRawWeight,
                        'period_days'    => $days,
                        'alternatives'   => [],
                        'ranking'        => [],
                        'summary'        => [
                            'total_products'    => 0,
                            'high_priority'     => 0,
                            'medium_priority'   => 0,
                            'low_priority'      => 0,
                        ],
                    ],
                ]);
            }

            // 4. Bangun Matriks Keputusan Awal
            $alternatives = [];
            $c1Values = []; // Stok
            $c2Values = []; // Penjualan
            $c3Values = []; // Harga

            foreach ($products as $p) {
                $pId = (int) ($p->product_id ?? $p->id);
                $stock = max(0, (int) $p->stock);
                $sold  = max(0, (int) ($salesData[$pId] ?? 0));
                $price = max(0, (int) $p->price);

                $c1Values[] = $stock;
                $c2Values[] = $sold;
                $c3Values[] = $price;

                $alternatives[] = [
                    'product_id' => $pId,
                    'barcode'    => $p->barcode,
                    'name'       => $p->name,
                    'category'   => $p->category,
                    'image'      => $p->image ? '/product/' . $p->image : '/product/default_product.jpeg',
                    'c1_stock'   => $stock,
                    'c2_sales'   => $sold,
                    'c3_price'   => $price,
                ];
            }

            // Cari Nilai Min & Max per Kriteria
            $c1Min = min($c1Values);
            $c1Max = max($c1Values);

            $c2Min = min($c2Values);
            $c2Max = max($c2Values);

            $c3Min = min($c3Values);
            $c3Max = max($c3Values);

            // 5. Perhitungan Utilitas SMART & Nilai Evaluasi Akhir
            $w1 = $criteria['c1_stock']['normalized_weight'];
            $w2 = $criteria['c2_sales']['normalized_weight'];
            $w3 = $criteria['c3_price']['normalized_weight'];

            $ranking = [];
            $highPriorityCount = 0;
            $medPriorityCount = 0;
            $lowPriorityCount = 0;

            foreach ($alternatives as $alt) {
                // Hitung Utilitas C1 (Cost): u(C1) = (C1_max - C1_i) / (C1_max - C1_min)
                if ($c1Max === $c1Min) {
                    $u1 = 1.0;
                } else {
                    $u1 = ($c1Max - $alt['c1_stock']) / ($c1Max - $c1Min);
                }

                // Hitung Utilitas C2 (Benefit): u(C2) = (C2_i - C2_min) / (C2_max - C2_min)
                if ($c2Max === $c2Min) {
                    $u2 = 1.0;
                } else {
                    $u2 = ($alt['c2_sales'] - $c2Min) / ($c2Max - $c2Min);
                }

                // Hitung Utilitas C3 (Benefit): u(C3) = (C3_i - C3_min) / (C3_max - C3_min)
                if ($c3Max === $c3Min) {
                    $u3 = 1.0;
                } else {
                    $u3 = ($alt['c3_price'] - $c3Min) / ($c3Max - $c3Min);
                }

                // Nilai Akhir SMART: V(Ai) = sum( Wj * u_ij )
                $score = ($w1 * $u1) + ($w2 * $u2) + ($w3 * $u3);
                $score = round($score, 4);

                // Klasifikasi Prioritas Pengadaan
                if ($score >= 0.65 || $alt['c1_stock'] <= 2) {
                    $priority = 'Sangat Mendesak';
                    $priorityClass = 'danger';
                    $highPriorityCount++;
                } elseif ($score >= 0.40 || $alt['c1_stock'] <= 10) {
                    $priority = 'Perlu Restock';
                    $priorityClass = 'warning';
                    $medPriorityCount++;
                } else {
                    $priority = 'Stok Aman';
                    $priorityClass = 'normal';
                    $lowPriorityCount++;
                }

                // Rekomendasi kuantitas restock (target safety stock 25 pcs atau 2x penjualan)
                $suggestedQty = max(10, min(100, max(0, 20 - $alt['c1_stock']) + ceil($alt['c2_sales'] * 0.5)));

                $ranking[] = [
                    'product_id'      => $alt['product_id'],
                    'barcode'         => $alt['barcode'],
                    'name'            => $alt['name'],
                    'category'        => $alt['category'],
                    'image'           => $alt['image'],
                    // Nilai Asli
                    'raw' => [
                        'stock'       => $alt['c1_stock'],
                        'sales'       => $alt['c2_sales'],
                        'price'       => $alt['c3_price'],
                    ],
                    // Nilai Utilitas
                    'utility' => [
                        'u1_stock'    => round($u1, 4),
                        'u2_sales'    => round($u2, 4),
                        'u3_price'    => round($u3, 4),
                    ],
                    // Nilai Akhir
                    'final_score'     => $score,
                    'score_percent'   => round($score * 100, 1),
                    'priority'        => $priority,
                    'priority_class'  => $priorityClass,
                    'suggested_qty'   => (int) $suggestedQty,
                ];
            }

            // 6. Urutkan Ranking dari Skor Tertinggi ke Terendah
            usort($ranking, function ($a, $b) {
                return $b['final_score'] <=> $a['final_score'];
            });

            // Beri nomor peringkat 1 s/d N
            foreach ($ranking as $idx => &$item) {
                $item['rank'] = $idx + 1;
            }
            unset($item);

            return response()->json([
                'status' => 'success',
                'data'   => [
                    'criteria'       => array_values($criteria),
                    'total_weight'   => $totalRawWeight,
                    'period_days'    => $days,
                    'min_max'        => [
                        'c1' => ['min' => $c1Min, 'max' => $c1Max],
                        'c2' => ['min' => $c2Min, 'max' => $c2Max],
                        'c3' => ['min' => $c3Min, 'max' => $c3Max],
                    ],
                    'alternatives'   => $alternatives,
                    'ranking'        => $ranking,
                    'summary'        => [
                        'total_products'   => count($ranking),
                        'high_priority'    => $highPriorityCount,
                        'medium_priority'  => $medPriorityCount,
                        'low_priority'     => $lowPriorityCount,
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error in AdminSpkSmartController@index: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memuat perhitungan SPK SMART. Silakan coba beberapa saat lagi.',
            ], 500);
        }
    }

    /**
     * Update Bobot Kriteria (AD-08: Pemilik Mengatur Bobot Kriteria)
     */
    public function updateWeights(Request $request)
    {
        try {
            $data = $request->validate([
                'c1_stock' => ['required', 'numeric', 'min:1', 'max:100'],
                'c2_sales' => ['required', 'numeric', 'min:1', 'max:100'],
                'c3_price' => ['required', 'numeric', 'min:1', 'max:100'],
            ]);

            $weights = [
                'c1_stock' => [
                    'code'   => 'C1',
                    'name'   => 'Stok Barang',
                    'type'   => 'cost',
                    'weight' => (int) $data['c1_stock'],
                    'desc'   => 'Kriteria Cost: Sisa stok fisik di toko/gudang.',
                ],
                'c2_sales' => [
                    'code'   => 'C2',
                    'name'   => 'Tingkat Penjualan',
                    'type'   => 'benefit',
                    'weight' => (int) $data['c2_sales'],
                    'desc'   => 'Kriteria Benefit: Total kuantitas barang terjual dalam periode terpilih.',
                ],
                'c3_price' => [
                    'code'   => 'C3',
                    'name'   => 'Harga & Nilai Ekonomi',
                    'type'   => 'benefit',
                    'weight' => (int) $data['c3_price'],
                    'desc'   => 'Kriteria Benefit: Harga jual / perputaran omzet produk.',
                ],
            ];

            Setting::updateOrCreate(
                ['key' => 'spk_smart_weights'],
                ['value' => json_encode($weights)]
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'Bobot kriteria SPK SMART berhasil diperbarui.',
                'data'    => $weights,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error in AdminSpkSmartController@updateWeights: ' . $e->getMessage());

            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui bobot kriteria SPK SMART.',
            ], 500);
        }
    }
}
