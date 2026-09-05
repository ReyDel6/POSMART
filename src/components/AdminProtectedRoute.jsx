// File: src/components/AdminProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export default function AdminProtectedRoute({ children }) {
    const token = localStorage.getItem('token');
    const userProfileRaw = localStorage.getItem('user_profile');

    if (!token) {
        // Belum login, arahkan ke halaman login
        return <Navigate to="/login" replace />;
    }

    try {
        let role = null;

        // 1. Coba dekode role dari JWT Token payload
        try {
            const base64Url = token.split('.')[1];
            if (base64Url) {
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                if (payload && payload.role) {
                    role = payload.role;
                }
            }
        } catch (jwtErr) {
            // ignore JWT decode error, fallback to user_profile
        }

        // 2. Fallback ke user_profile jika token lama belum menyertakan claim role
        if (!role && userProfileRaw) {
            const user = JSON.parse(userProfileRaw);
            role = user?.role;
        }

        // Cek apakah role adalah admin
        if (role !== 'admin') {
            // Jika bukan admin (misal cashier/user), tendang ke katalog utama
            return <Navigate to="/" replace />;
        }
    } catch (e) {
        // Jika token/profile rusak, bersihkan dan arahkan ke login
        localStorage.clear();
        return <Navigate to="/login" replace />;
    }

    return children;
}
