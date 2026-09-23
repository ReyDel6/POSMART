<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Support\Collection;

/**
 * Mesin harga promosi (server-side, otoritatif).
 * Jenis promo:
 *   - block : diskon blok berjenjang, mis. "beli 2 -> 5%", "beli 3+ -> 10%"
 *   - b1g1  : beli X gratis Y (Beli 2 Gratis 1, dst.)
 *   - bundle: paket gabungan beberapa produk dengan harga khusus
 * Produk yang di-flag is_promo + promo (persen) tetap jalan sebagai diskon dasar.
 */
class PromotionService
{
    /** @var array<int, Promotion>|null */
    private $dealMap = null;

    /** @var Promotion[]|null */
    private $dealById = null;

    public function activeQuery()
    {
        return Promotion::query()
            ->where('active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }

    /** Promo berbasis produk aktif (block/b1g1), urut terbaru dulu. */
    public function activeDeals(): Collection
    {
        return $this->activeQuery()
            ->whereIn('type', ['block', 'b1g1'])
            ->whereNotNull('product_id')
            ->orderBy('id', 'desc')
            ->get();
    }

    public function activeBundles(): Collection
    {
        return $this->activeQuery()->where('type', 'bundle')->orderBy('id', 'desc')->get();
    }

    private function ensureDealCache(): void
    {
        if ($this->dealMap !== null) {
            return;
        }
        $this->dealMap   = [];
        $this->dealById  = [];
        foreach ($this->activeDeals() as $d) {
            /** @var Promotion $d */
            $this->dealById[(int) $d->id] = $d;
            // Promo pertama (terbaru) yang cocok utk sebuah produk menjadi pemenang.
            $pid = (int) $d->product_id;
            $this->dealMap[$pid] = $this->dealMap[$pid] ?? $d;
        }
    }

    public function dealFor(int $productId): ?Promotion
    {
        $this->ensureDealCache();
        return $this->dealMap[$productId] ?? null;
    }

    /** Validasi promo yang dikirim klien: harus cocok produk & masih aktif, jika tidak -> auto. */
    public function resolveDeal(?int $promoId, int $productId): ?Promotion
    {
        $this->ensureDealCache();
        $deal = $this->dealMap[$productId] ?? null;
        if ($deal && $promoId !== null && (int) $promoId > 0 && (int) $deal->id === $promoId) {
            return $deal;
        }
        return $deal;
    }

    public function resolveBundle(int $bundleId): ?Promotion
    {
        return Promotion::where('id', $bundleId)
            ->where('type', 'bundle')
            ->where('active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->first();
    }

    public function label(Promotion $p): string
    {
        if ($p->type === 'b1g1') {
            $buy  = max(1, (int) ($p->buy_qty ?: 1));
            $free = max(1, (int) ($p->free_qty ?: 1));
            return "Beli {$buy} Gratis {$free}";
        }
        $max = 0;
        foreach ((array) $p->tiers as $t) {
            $max = max($max, (int) ($t['percent'] ?? 0));
        }
        if ($max > 0) {
            return "Hingga diskon {$max}%";
        }
        return $p->name;
    }

    /** Tingkat diskon blok tertinggi yang memenuhi qty. */
    public function tierFor(Promotion $p, int $qty): ?array
    {
        $best = null;
        foreach ((array) $p->tiers as $t) {
            $min = (int) ($t['min_qty'] ?? 0);
            if ($qty >= $min && $min > 0 && (int) ($t['percent'] ?? 0) > 0) {
                if ($best === null || $min > (int) ($best['min_qty'] ?? 0)) {
                    $best = $t;
                }
            }
        }
        return $best;
    }

    /**
     * Harga efektif satu baris keranjang (otentik dari DB, bukan dari klien).
     *
     * @return array{unit:int, total:int, discount:int, label:?string}
     */
    public function pricing(Product $p, int $qty, ?Promotion $deal = null): array
    {
        $base  = (int) $p->price;
        $unit  = $base;
        $total = $base * $qty;

        if ($deal && (int) $deal->product_id === (int) $p->id && $deal->type === 'b1g1') {
            $buy   = max(1, (int) ($deal->buy_qty ?: 1));
            $free  = max(1, (int) ($deal->free_qty ?: 1));
            $groups = intdiv($qty, $buy + $free);
            $payCount = $qty - ($groups * $free);
            $total = $payCount * $base;
            $unit  = $qty > 0 ? (int) round($total / $qty) : $base;

            return [
                'unit'     => $unit,
                'total'    => $total,
                'discount' => ($base * $qty) - $total,
                'label'    => $this->label($deal),
            ];
        }

        if ($deal && (int) $deal->product_id === (int) $p->id && $deal->type === 'block') {
            $tier = $this->tierFor($deal, $qty);
            if ($tier) {
                $pct   = max(1, min(90, (int) ($tier['percent'] ?? 0)));
                $unit  = (int) round($base * (100 - $pct) / 100);
                $total = $unit * $qty;

                return [
                    'unit'     => $unit,
                    'total'    => $total,
                    'discount' => ($base * $qty) - $total,
                    'label'    => $this->label($deal),
                ];
            }
        }

        // Diskon persen produk klasik (is_promo + promo).
        if ($p->is_promo && (int) $p->promo > 0) {
            $pct   = min(90, (int) $p->promo);
            $unit  = (int) round($base * (100 - $pct) / 100);
            $total = $unit * $qty;

            return [
                'unit'     => $unit,
                'total'    => $total,
                'discount' => ($base * $qty) - $total,
                'label'    => $pct > 0 ? "-{$pct}%" : null,
            ];
        }

        return ['unit' => $unit, 'total' => $total, 'discount' => 0, 'label' => null];
    }

    /** Kelengkapan detail satu paket/bundle untuk ditampilkan & duplikasi harga di keranjang. */
    public function bundlePayload(Promotion $b): array
    {
        $items    = [];
        $listTotal = 0;
        foreach ((array) $b->items as $row) {
            $prod = Product::where('id', (int) ($row['product_id'] ?? 0))->first();
            if (!$prod) {
                continue;
            }
            $qty    = max(1, (int) ($row['qty'] ?? 1));
            $items[] = [
                'product_id' => (int) $prod->id,
                'name'       => $prod->name,
                'image'      => '/product/' . $prod->image,
                'price'      => (int) $prod->price,
                'qty'        => $qty,
            ];
            $listTotal += (int) $prod->price * $qty;
        }

        $bundlePrice = max(0, (int) $b->bundle_price);
        $save        = max(0, $listTotal - $bundlePrice);

        return [
            'bundle_id'    => (int) $b->id,
            'name'         => $b->name,
            'bundle_price' => $bundlePrice,
            'list_total'   => $listTotal,
            'save'         => $save,
            'save_percent' => $listTotal > 0 ? (int) round($save * 100 / $listTotal) : 0,
            'items'        => $items,
        ];
    }
}