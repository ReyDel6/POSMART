// File: src/utils/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    validateStatus: function (status) {
        return status >= 200 && status < 600; // Terima semua status code sebagai "Response", bukan "Error"
    }

});

// Interceptor Request: DIJALANKAN SETIAP KALI REACT MENEMBAK API
api.interceptors.request.use(
    (config) => {
        // AMBIL TOKEN SECARA DINAMIS DI SINI
        const token = localStorage.getItem('token');

        if (token) {
            // Pasang header Authorization & X-Authorization (anti-blokir Apache CGI/cPanel)
            config.headers.Authorization = `Bearer ${token}`;
            config.headers['X-Authorization'] = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const setAuthTokenHeader = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['X-Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common['X-Authorization'];
    }
};

// Interceptor Response 
api.interceptors.response.use(
    (response) => {
        // validateStatus menerima semua status < 600 sebagai "response",
        // jadi 401 yang lolos di sini memang perlu ditangani sebagai token tidak valid.
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_profile');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return response;
    },
    (error) => {
        // Jalur ini hanya untuk kegagalan jaringan/timeout (bukan status HTTP).
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_profile');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;