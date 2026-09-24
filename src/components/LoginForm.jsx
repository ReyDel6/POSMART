// File: components/LoginForm.jsx
import { useState } from "react";
import api, { setAuthTokenHeader } from '../utils/api';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";

const DEMO_ACCOUNTS = [
    { label: 'Pemilik Toko', email: 'owner@posmart.test', dot: 'bg-violet-500' },
    { label: 'Admin', email: 'admin@posmart.test', dot: 'bg-red-500' },
    { label: 'Kasir', email: 'kasir@posmart.test', dot: 'bg-emerald-500' },
    { label: 'Pelanggan', email: 'pelanggan@posmart.test', dot: 'bg-sky-500' },
];

export default function LoginForm({ onLoginSuccess }) {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/user/login.php', formData);

            if (response.data.status === 'success') {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_profile', JSON.stringify(response.data.user));
                setAuthTokenHeader(response.data.token);

                if (onLoginSuccess) onLoginSuccess(response.data.user);
            }
        } catch (err) {
            if (err.response?.status === 429) {
                setError(err.response?.data?.message || "Terlalu banyak percobaan login. Coba lagi beberapa saat lagi.");
            } else {
                setError(err.response?.data?.message || err.message || "Terjadi kesalahan saat login.");
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full text-sm pl-11 pr-11 py-3 border-2 border-ink/30 rounded-xl focus:outline-none focus:border-ink focus:ring-2 focus:ring-lime transition-all bg-cream/50";

    return (
        <form onSubmit={handleFormSubmit} className="space-y-4">
            {error && (
                <div className="text-sm text-red-700 bg-red-50 border-2 border-ink p-3 rounded-xl animate-shake">
                    {error}
                </div>
            )}

            <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-bold text-slate-600">e-Mail</label>
                <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        autoComplete="email"
                        placeholder="nama@email.com"
                        className={inputClass}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-bold text-slate-600">Password</label>
                <Link to="/forgot-password" className="text-xs font-black text-coral hover:underline transition-colors cursor-pointer">
                    Lupa password?
                </Link>
            </div>
                <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={inputClass}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-3 bg-ink hover:bg-slate-900 disabled:bg-slate-400 text-cream font-black text-sm rounded-xl border-2 border-ink shadow-[3px_3px_0_#161616] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                    <LogIn className="w-4 h-4 text-lime" />
                    {loading ? "Memproses..." : "Masuk Akun"}
                </button>
                <Link
                    to="/register"
                    className="flex-1 flex items-center justify-center py-3 px-4 border-2 border-coral text-coral font-black text-sm rounded-xl hover:bg-lime transition-colors cursor-pointer"
                >
                    Daftar
                </Link>
            </div>

            <div className="rounded-xl bg-[#EFEFE6] p-3 text-xs text-slate-500 border-2 border-ink">
                <p className="font-black text-ink mb-2">Akun demo — klik untuk mengisi otomatis:</p>
                <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                        <button
                            key={acc.email}
                            type="button"
                            onClick={() => setFormData({ email: acc.email, password: 'password' })}
                            className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-left border-2 border-ink/40 hover:border-ink hover:bg-lime hover:border-ink transition cursor-pointer"
                        >
                            <span className={`h-2 w-2 rounded-full ${acc.dot} shrink-0`}></span>
                            <span className="min-w-0">
                                <span className="block font-black text-ink truncate">{acc.label}</span>
                                <span className="block truncate font-mono text-[10px] text-slate-500">{acc.email}</span>
                            </span>
                        </button>
                    ))}
                </div>
                <p className="mt-2">Password semua akun: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-ink">password</code></p>
            </div>
        </form>
    );
}