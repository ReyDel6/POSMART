// File: hooks/useProduct.js
import { useState, useCallback, useRef } from "react";
import  api  from "../utils/api";

/**
 * Hook untuk mengambil data produk dari backend (dengan search, filter kategori,
 * dan pagination).
 */
export function useProduct() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const requestId = useRef(0);
    const [pagination, setPagination] = useState({
        current_page: 1,
        total_page: 1,
        total_data: 0,
    });

    const fetchProducts = useCallback(async (filters = {}) => {
        const currentRequest = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            const page = filters.page || 1;
            const search = filters.search || '';
            const category = filters.category || 'All';
            const perPage = filters.per_page || 6;
            const sort = filters.sort || 'newest';

            let response;
            let lastError;
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    response = await api.get(
                        `/get.product.php?page=${page}&per_page=${perPage}&sort=${sort}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`
                    );
                    if (response.status < 500) break;
                } catch (requestError) {
                    lastError = requestError;
                    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }
            if (!response && lastError) throw lastError;
            if (currentRequest !== requestId.current) return;

            if (response.data && response.data.status === 'success') {
                setProducts(response.data.data);
                setPagination({
                    current_page: response.data.pagination?.page || parseInt(page),
                    total_page: response.data.pagination?.totalPages || 1,
                    total_data: response.data.pagination?.total || 0,
                });
            } else {
                setError(response.data?.message || 'Gagal memuat produk');
            }

        } catch (err) {
            if (currentRequest !== requestId.current) return;
            console.error('Gagal memuat produk:', err);
            const serverMessage = err.response?.data?.message;
            setError(serverMessage || 'Server sedang sibuk atau tidak terhubung. Coba lagi.');
        } finally {
            if (currentRequest === requestId.current) setLoading(false);
        }
    }, []);

    return {
        products,
        loading,
        error,
        pagination,
        fetchProducts
    };
}