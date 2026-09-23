// Mirrors backend App\Services\PromotionService::pricing (harus identik!)
// Digunakan untuk menampilkan harga efektif di keranjang & checkout.
export function percentOf(p) {
    const active = !!p?.is_promo && Number(p?.promo) > 0;
    return active ? Math.max(1, Math.min(90, Number(p.promo))) : 0;
}

export function linePrice(p, qty, deal) {
    const base = Number(p?.price) || 0;
    if (!deal) {
        const pct = percentOf(p);
        if (pct > 0) {
            const unit = Math.round(base * (100 - pct) / 100);
            return { unit, total: unit * qty, discount: base * qty - unit * qty, label: `-${pct}%` };
        }
        return { unit: base, total: base * qty, discount: 0, label: null };
    }

    if (deal.type === 'b1g1') {
        const buy = Math.max(1, Number(deal.buy_qty) || 1);
        const free = Math.max(1, Number(deal.free_qty) || 1);
        const groups = Math.floor(qty / (buy + free));
        const pay = Math.max(0, qty - groups * free);
        const total = pay * base;
        return { unit: qty > 0 ? Math.round(total / qty) : base, total, discount: base * qty - total, label: deal.label || `Beli ${buy} Gratis ${free}` };
    }

    if (deal.type === 'block') {
        let best = null;
        for (const t of deal.tiers || []) {
            const min = Number(t.min_qty) || 0;
            if (qty >= min && min > 0 && Number(t.percent) > 0 && (!best || min > (Number(best.min_qty) || 0))) {
                best = t;
            }
        }
        if (best) {
            const pct = Math.max(1, Math.min(90, Number(best.percent)));
            const unit = Math.round(base * (100 - pct) / 100);
            return { unit, total: unit * qty, discount: base * qty - unit * qty, label: deal.label || `Diskon ${pct}%` };
        }
    }

    // deal ada tapi belum memenuhi syarat -> harga normal produk (persen produk tetap jalan)
    return linePrice({ ...p, is_promo: false, promo: 0 }, qty, null);
}

export function bundleLinePrice(bundle, qty = 1) {
    const unit = Number(bundle?.bundle_price) || 0;
    const list = Number(bundle?.list_total) || 0;
    return { unit, total: unit * qty, discount: Math.max(0, list - unit) * qty, label: 'Paket' };
}

export function formatRupiah(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}