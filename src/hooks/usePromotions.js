import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

let cache = null;

export function usePromotions() {
    const [data, setData] = useState(() => cache || { deals: [], bundles: [], byProduct: {}, byBundleId: {}, loaded: !!cache });

    useEffect(() => {
        if (cache) {
            setData({ ...cache, loaded: true });
            return;
        }
        let active = true;
        api.get('/get.promotions.php')
            .then(res => {
                if (active && res.data && res.data.status === 'success') {
                    const deals = Array.isArray(res.data.data?.deals) ? res.data.data.deals : [];
                    const bundles = Array.isArray(res.data.data?.bundles) ? res.data.data.bundles : [];
                    const byProduct = {};
                    const byBundleId = {};
                    for (const d of deals) {
                        if (d.product_id && !byProduct[d.product_id]) byProduct[d.product_id] = d;
                    }
                    for (const b of bundles) {
                        if (b.bundle_id) byBundleId[String(b.bundle_id)] = b;
                    }
                    cache = { deals, bundles, byProduct, byBundleId, loaded: true };
                    setData(cache);
                }
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const reload = useMemo(() => () => {
        cache = null;
        setData({ deals: [], bundles: [], byProduct: {}, byBundleId: {}, loaded: false });
    }, []);

    return { ...data, reload };
}