//File: pages/LoginPage.jsx
import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useGoogleLogin } from "@react-oauth/google";
import api from '../utils/api';
import AuthLayout from '../components/AuthLayout';
import GoogleIcon from '../components/GoogleIcon';

export default function LoginPage() {
    const navigate = useNavigate();

    const handleGoogleLoginSuccess = async (tokenResponse) => {
        try {
            const authorizationCode = tokenResponse.code;
            const response = await api.post('/user/googleauth.php', {
                code: authorizationCode
            });
            if (response.data && response.data.status === 'success') {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_profile', JSON.stringify(response.data.user));

                if (response.data.user.role === 'admin' || response.data.user.role === 'owner') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            console.error("Google auth", err);
            alert(err.response?.data?.message || "gagal login menggunakan google");
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        flow: 'auth-code'
    });

    const handleLoginSuccess = (user) => {
        if (user.role === 'admin' || user.role === 'owner') {
            navigate('/admin');
        } else {
            navigate('/');
        }
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-md bg-white rounded-3xl border-2 border-ink shadow-[8px_8px_0_#161616] p-7 sm:p-10">
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-ink tracking-tight">Selamat datang kembali</h2>
                    <p className="text-sm text-slate-500 mt-1.5">Masuk untuk lanjut belanja kebutuhan harian.</p>
                </div>

                <LoginForm onLoginSuccess={handleLoginSuccess} />

                <div className="flex items-center gap-3 my-6">
                    <span className="h-px flex-1 bg-ink/15" />
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">atau</span>
                    <span className="h-px flex-1 bg-ink/15" />
                </div>

                <button
                    onClick={() => loginWithGoogle()}
                    className="w-full bg-white border-2 border-ink hover:bg-lime text-ink font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-[3px_3px_0_#161616] cursor-pointer text-sm"
                >
                    <GoogleIcon className="w-5 h-5" />
                    Masuk dengan Google
                </button>

                <p className="mt-7 text-center text-sm text-slate-500">
                    Belum punya akun?{' '}
                    <Link to="/register" className="text-coral font-black hover:underline">Daftar di sini</Link>
                </p>
            </div>
        </AuthLayout>
    );
}