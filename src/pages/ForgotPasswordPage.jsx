// File: pages/ForgotPasswordPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, LogIn, Loader2 } from 'lucide-react';
import api from '../utils/api';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [demoToken, setDemoToken] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setDemoToken('');
        setLoading(true);
        try {
            const response = await api.post('/user/forgot-password.php', { email });
            if (response.data.status === 'success') {
                setSuccess(response.data.message || 'Permintaan reset password berhasil dibuat.');
                if (response.data.token) {
                    setDemoToken(response.data.token);
                }
            }
        } catch (err) {
            if (err.response?.status === 429) {
                setError(err.response?.data?.message || 'Terlalu banyak permintaan. Coba lagi nanti.');
            } else {
                setError(err.response?.data?.message || 'Gagal membuat permintaan reset password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-7 sm:p-10">
                <button onClick={() => navigate('/login')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-6">
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke login
                </button>

                <div className="mb-7">
                    <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-4">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lupa password?</h2>
                    <p className="text-sm text-slate-500 mt-1.5">Masukkan e-mail Anda. Kami akan membuat kode reset agar Anda bisa membuat password baru.</p>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl mb-4 animate-shake">{error}</div>
                )}
                {success && (
                    <div className="text-sm text-green-700 bg-green-50 border border-green-100 p-3 rounded-xl mb-4">
                        {success}
                    </div>
                )}

                {demoToken && (
                    <div className="rounded-xl bg-slate-900 text-slate-200 p-4 mb-4 border border-slate-800">
                        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Kode reset (mode demo)</p>
                        <code className="font-mono text-sm break-all bg-slate-800 px-2.5 py-1.5 rounded-lg block">{demoToken}</code>
                        <p className="text-[11px] text-slate-400 mt-2">Gunakan kode ini di halaman reset bila Anda tidak menerima email.</p>
                    </div>
                )}

                {!demoToken && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="email" className="text-xs font-bold text-slate-600">e-Mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@email.com"
                                    className="w-full text-sm pl-11 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all bg-slate-50/50"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-sm shadow-green-600/20"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                            {loading ? 'Memproses...' : 'Kirim Permintaan Reset'}
                        </button>

                        <p className="text-center text-sm text-slate-500">
                            Ingat password?{' '}
                            <Link to="/login" className="text-green-600 font-bold hover:underline">Masuk di sini</Link>
                        </p>
                    </form>
                )}

                {demoToken && (
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate(demoToken ? `/reset-password?token=${encodeURIComponent(demoToken)}&email=${encodeURIComponent(email)}` : '/login')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-sm shadow-green-600/20"
                        >
                            <LogIn className="w-4 h-4" /> Lanjutkan ke Reset Password
                        </button>
                        <button
                            onClick={() => { setDemoToken(''); setSuccess(''); setEmail(''); }}
                            className="w-full py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                        >
                            Kirim ulang / email lain
                        </button>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}