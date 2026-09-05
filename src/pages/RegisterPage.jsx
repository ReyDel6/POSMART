import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Mail, Lock, Phone, MapPin, CheckCircle } from "lucide-react";
import api from '../utils/api';

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-8">
            <div className='w-full max-w-4xl bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8'>
                {/* Bagian Kiri: Branding atau Ilustrasi */}
                <div className="hidden md:flex md:w-1/2 bg-red-50 rounded-xl items-center justify-center p-8">
                    <div className="text-center">
                        <Store className="w-20 h-20 text-red-600 mx-auto mb-4"/>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">POS Mart</h2>
                        <p className="text-slate-600 mt-2">Daftarkan akun Anda dan mulailah mengelola penjualan dengan lebih mudah.</p>
                    </div>
                </div>

                {/* Bagian Kanan: Form Register */}
                <div className="w-full md:w-1/2">
                    <div className="mb-6 flex items-center gap-2 md:hidden">
                        <div className="p-2 bg-red-600 rounded-xl text-white">
                            <Store className="w-6 h-6"/>
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                            POS <span className="text-red-600">Mart</span>
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-5">Daftar Akun Baru</h3>

                    {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mb-4 border border-red-100">{error}</div>}
                    {success && (
                        <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg mb-4 border border-emerald-100 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        {/* Nama Lengkap */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Nama Lengkap</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                                    placeholder="Budi Santoso"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">e-Mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input 
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                                    placeholder="budi@example.com"
                                />
                            </div>
                        </div>

                        {/* No Telepon & Alamat (Grid sampingan jika ingin hemat tempat) */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">No. Telepon (Opsional)</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                                        placeholder="081234567890"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Alamat (Opsional)</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <textarea 
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="w-full text-sm pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 resize-none"
                                    placeholder="Jl. Anggrek No. 12"
                                />
                            </div>
                        </div>

                        {/* Password Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Konfirmasi Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-sm"
                        >
                            {loading ? "Mendaftarkan ...." : "Daftar Sekarang"}
                        </button>
                    </form>

                    <div className="mt-5 text-center text-sm text-slate-500">
                        Sudah punya akun?{" "}
                        <Link to="/login" className="text-red-600 font-bold hover:underline">
                            Masuk di sini
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
