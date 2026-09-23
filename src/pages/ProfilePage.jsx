// File: src/pages/ProfilePage.jsx
import { useState } from 'react';
import { Mail, Phone, MapPin, LogOut, Store, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';

export default function ProfilePage() {
    const [profile] = useState(() => {
        try {
            const saved = localStorage.getItem('user_profile');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error('Gagal membaca profil:', e);
            return null;
        }
    });

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_profile');
        window.location.href = '/';
    };

    const initial = (profile?.name || '?').charAt(0).toUpperCase();
    const roleLabel = profile?.role === 'admin' ? 'Administrator' : profile?.role === 'owner' ? 'Pemilik Toko' : profile?.role === 'cashier' ? 'Kasir' : 'Pelanggan';
    const isBackOffice = profile?.role === 'admin' || profile?.role === 'owner';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
            <div className="absolute top-4 left-4">
                <a href="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors inline-flex items-center gap-2 text-slate-700 text-sm font-semibold px-4 py-2">
                    <ArrowLeft className="w-4 h-4" /> Kembali
                </a>
            </div>

            <div className="w-full max-w-md mt-12">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-950 h-24 relative">
                        <div className="absolute -right-8 -bottom-16 w-40 h-40 rounded-full border-[22px] border-red-600/20" />
                    </div>
                    <div className="px-6 pb-6">
                        <div className="flex items-center gap-4 -mt-10">
                            <div className="w-20 h-20 rounded-2xl bg-red-600 text-white text-3xl font-black flex items-center justify-center border-4 border-white shadow-lg">
                                {initial}
                            </div>
                            <div className="pt-8">
                                <h2 className="text-xl font-black text-slate-900">{profile?.name || 'Belum login'}</h2>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${profile?.role === 'admin' ? 'bg-red-100 text-red-700' : profile?.role === 'owner' ? 'bg-violet-100 text-violet-700' : profile?.role ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {isBackOffice ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                    {roleLabel.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {!profile ? (
                            <div className="mt-8 text-center">
                                <p className="text-sm text-slate-500">Anda belum masuk. Silakan login untuk melihat profil.</p>
                                <a href="/login" className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                                    <LogOut className="w-4 h-4" /> Login
                                </a>
                            </div>
                        ) : (
                            <>
                                <div className="mt-6 space-y-3">
                                    <ProfileRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile.email || '-'} />
                                    <ProfileRow icon={<Phone className="w-4 h-4" />} label="Telepon" value={profile.phone || '-'} />
                                    <ProfileRow icon={<MapPin className="w-4 h-4" />} label="Alamat" value={profile.address || '-'} />
                                    {isBackOffice && (
                                        <a href="/admin" className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                                            <Store className="w-4 h-4" /> Buka Panel {profile?.role === 'owner' ? 'Owner' : 'Admin'}
                                        </a>
                                    )}
                                </div>
                                <button onClick={handleLogout} className="mt-6 w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl text-sm transition-colors">
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3.5">
            <div className="text-red-600 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
            </div>
        </div>
    );
}