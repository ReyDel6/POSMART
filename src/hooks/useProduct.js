// File: hooks/useProduct.js
import { useState, useCallback } from "react";
import  api  from "../utils/api";

/**
 * Hook untuk mengambil data produk dari backend (dengan search, filter kategori,
 * dan pagination).
 */
export function useProduct() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        current_page: 1,
        total_page: 1,
        total_data: 0,
    });

    const fetchProducts = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const page = filters.page || 1;
            const search = filters.search || '';
            const category = filters.category || 'All';

            const response = await api.get(
                `/get.product.php?page=${page}&search=${encodeURIComponent(search)}&category=${category}`
            );

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
            console.error('Gagal memuat produk:', err);
            setError('Gagal terhubung ke database posmart. Coba lagi nanti.');
        } finally {
            setLoading(false);
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