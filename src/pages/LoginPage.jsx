//File: pages/LoginPage.jsx
import { useNavigate} from 'react-router-dom' ;
import LoginForm from '../components/LoginForm';
import { useGoogleLogin } from "@react-oauth/google";
import { Store, ArrowLeft } from "lucide-react";
import api from '../utils/api'

export default function LoginPage(){
    const navigate = useNavigate();

    const handleGoogleLoginSuccess = async (tokenResponse) => {
        try {
            const authorizationCode = tokenResponse.code;
            const response = await api.post('/user/googleauth.php', {
                code: authorizationCode
            })
            if (response.data && response.data.status === 'success') {
                localStorage.setItem('token', response.data.token)
                localStorage.setItem('user_profile', JSON.stringify(response.data.user));

                navigate('/');
            }
        } catch (err) {
            console.error("Google auth")
            alert(err.response?.data?.message || "gagal login menggunakan google");
        }
    }
    const loginWithGoogle = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        flow: 'auth-code'
    });
    const handleLoginSuccess = (user) => {
        if (user.role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen flex  flex-col items-center justify-center bg-slate-50 p-4">
            <div className="absolute top-4 left-4">
                <a href="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors flex items-center justify-center">
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </a>
            </div>
            <div className="mb-6 flex items-center gap-2">
                <div className="p-2 bg-red-600 rounded-xl text-white">
                    <Store className="w-6 h-6"/>
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tight">
                    POS <span className="text-red-600">Mart</span>
                </span>
            </div>

            {/* login form  */}
            <div className='w-full max-w-sm'>
                <LoginForm onLoginSuccess= {handleLoginSuccess}/>
            </div>

            <div className="w-full max-w-sm mt-4">
                <button 
                    onClick={() => loginWithGoogle()}
                    className='w-full bg-white border border-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer text-sm'>
                    <img src="/avatars/images.png" className='w-5 h-5' alt="google logo"/>
                    Masuk dengan Google
                </button>
            </div>
        </div>
    )
}