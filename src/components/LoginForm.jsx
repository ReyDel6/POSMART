// File: components/LoginForm.jsx
import { useState } from "react";
import  api, {setAuthTokenHeader} from '../utils/api'; // <--- Perubahan ada di sini (tambah kurung kurawal)
import { Mail, Lock, LogIn } from "lucide-react";

export default function LoginForm({ onLoginSuccess }) {
    const [formData, setFormData] = useState({ email: 'admin@posmart.com', password: 'posmart2026' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        console.log("1. Kirim data ...", formData);

        try {
            const response = await api.post('/user/login.php', formData);
            console.log("2. Response dari server ...", response.data);
            
            if (response.data.status === 'success') {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_profile', JSON.stringify(response.data.user));

                setAuthTokenHeader(response.data.token);

                if (onLoginSuccess) onLoginSuccess(response.data.user);
            }
        } catch (err) {
            console.log("3. terjadi error")
            console.error("Login error:", err);
            
            if(err.response){
                console.log("4. response dari server", err.response.data);
                setError(err.response.data.message || "error tanpa pesan");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Login POSMart</h3>

            {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}

            {/* e-mail */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">e-Mail</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                        placeholder="admin@posmart.com"
                    />
                </div>
            </div>

            {/* password */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full text-sm pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {/* submit */}
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-2.5 bg-red-600 hover:bg-red-800 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                    <LogIn className="w-4 h-4" />
                    {loading ? "Memproses ...." : "Masuk Akun"}
                </button>
                <a href="/register" className="flex-1 flex items-center justify-center py-2.5 px-4 border border-red-600 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors cursor-pointer">
                    Daftar
                </a>
            </div>
        </form>
    );
}