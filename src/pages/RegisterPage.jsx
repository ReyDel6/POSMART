// File: src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Phone, MapPin, CheckCircle } from "lucide-react";
import api from '../utils/api';
import AuthLayout from '../components/AuthLayout';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError("Konfirmasi password tidak cocok.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password minimal harus 6 karakter.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/user/register.php', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                address: formData.address
            });

            if (response.data && response.data.status === 'success') {
                setSuccess(response.data.message || "Registrasi berhasil!");
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    phone: '',
                    address: ''
                });
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(response.data?.message || "Terjadi kesalahan saat registrasi.");
            }
        } catch (err) {
            console.error("Register error:", err);
            setError(err.response?.data?.message || "Gagal menghubungkan ke server.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full text-sm pl-11 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all bg-slate-50/50";
    const passwordInputClass = "w-full text-sm pl-11 pr-11 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all bg-slate-50/50";

    return (
        <AuthLayout panelSide="right">
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-7 sm:p-10">
                <div className="mb-7">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Akun Baru</h2>
                    <p className="text-sm text-slate-500 mt-1.5">Mulai belanja cepat & nikmati keuntungan member.</p>
                </div>

                {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl mb-4 animate-shake">{error}</div>}
                {success && (
                    <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {success}
                    </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="name" className="text-xs font-bold text-slate-600">Nama Lengkap</label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                autoComplete="name"
                                placeholder="Budi Santoso"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="email" className="text-xs font-bold text-slate-600">e-Mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                autoComplete="email"
                                placeholder="budi@example.com"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="password" className="text-xs font-bold text-slate-600">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    className={passwordInputClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-600">Konfirmasi Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    className={passwordInputClass}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(v => !v)}
                                    aria-label={showConfirm ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                >
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="phone" className="text-xs font-bold text-slate-600">No. Telepon <span className="text-slate-400 font-medium">(Opsional)</span></label>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                            <input
                                id="phone"
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                autoComplete="tel"
                                placeholder="081234567890"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="address" className="text-xs font-bold text-slate-600">Alamat <span className="text-slate-400 font-medium">(Opsional)</span></label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                            <textarea
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                rows="2"
                                autoComplete="street-address"
                                placeholder="Jl. Anggrek No. 12"
                                className="w-full text-sm pl-11 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all bg-slate-50/50 resize-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-sm shadow-green-600/20"
                    >
                        {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    Sudah punya akun?{" "}
                    <Link to="/login" className="text-green-600 font-bold hover:underline">Masuk di sini</Link>
                </p>
            </div>
        </AuthLayout>
    );
}