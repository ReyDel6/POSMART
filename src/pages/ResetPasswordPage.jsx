// File: pages/ResetPasswordPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import api from '../utils/api';
import AuthLayout from '../components/AuthLayout';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialToken = searchParams.get('token') || '';
    const initialEmail = searchParams.get('email') || '';

    const [email, setEmail] = useState(initialEmail);
    const [token, setToken] = useState(initialToken);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('Password minimal 6 karakter.');
            return;
        }
        if (password !== confirm) {
            setError('Konfirmasi password tidak sama.');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/user/reset-password.php', { email, token, password });
            if (response.data.status === 'success') {
                alert(response.data.message || 'Password berhasil direset. Silakan login dengan password baru.');
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mereset password. Periksa kembali e-mail dan kode reset.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full text-sm pl-11 pr-11 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all bg-slate-50/50";

    return (
        <AuthLayout>
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-7 sm:p-10">
                <button onClick={() => navigate('/forgot-password')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-6">
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>

                <div className="mb-7">
                    <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-4">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Buat password baru</h2>
                    <p className="text-sm text-slate-500 mt-1.5">Masukkan e-mail, kode reset, dan password baru Anda.</p>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl mb-4 animate-shake">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="email" className="text-xs font-bold text-slate-600">e-Mail</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className={inputClass} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="token" className="text-xs font-bold text-slate-600">Kode Reset</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                            <input id="token" type="text" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Kode reset dari email/demo" className="w-full text-sm pl-11 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all bg-slate-50/50 font-mono" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="password" className="text-xs font-bold text-slate-600">Password Baru</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimal 6 karakter"
                                className={inputClass}
                            />
                            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Tampilkan password" className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="confirm" className="text-xs font-bold text-slate-600">Konfirmasi Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                            <input
                                id="confirm"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="Ulangi password baru"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-sm shadow-green-600/20"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        {loading ? 'Memproses...' : 'Reset Password'}
                    </button>

                    <p className="text-center text-sm text-slate-500">
                        Sudah ingat?{' '}
                        <Link to="/login" className="text-green-600 font-bold hover:underline">Masuk di sini</Link>
                    </p>
                </form>
            </div>
        </AuthLayout>
    );
}