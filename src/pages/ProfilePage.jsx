// File: src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import {
    Mail, Phone, MapPin, LogOut, Store, ShieldCheck, UserCheck, Coins,
    TrendingUp, TrendingDown, ShoppingBag, ChevronRight, Sparkles, Crown,
} from 'lucide-react';
import Header from '../components/Header';
import api from '../utils/api';

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

    const [points, setPoints] = useState(null);

    useEffect(() => {
        if (!profile || !localStorage.getItem('token')) return;
        let active = true;
        api.get('/user/points.php')
            .then(res => {
                if (active && res.data?.status === 'success') {
                    setPoints(res.data.data);
                }
            })
            .catch(() => {});
        return () => { active = false; };
    }, [profile]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_profile');
        window.location.href = '/';
    };

    const initial = (profile?.name || '?').charAt(0).toUpperCase();
    const roleLabel = profile?.role === 'admin' ? 'Administrator' : profile?.role === 'owner' ? 'Pemilik Toko' : profile?.role === 'cashier' ? 'Kasir' : 'Pelanggan';
    const isBackOffice = profile?.role === 'admin' || profile?.role === 'owner';

    const formatIDR = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(v) || 0);

    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            <Header />

            <div className="max-w-md mx-auto px-4 py-8">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

                    {/* ===== Header profil ===== */}
                    <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 h-28 relative overflow-hidden">
                        <div className="absolute -right-10 -top-14 w-48 h-48 rounded-full border-[26px] border-white/10" />
                        <div className="absolute -left-8 -bottom-16 w-40 h-40 rounded-full border-[22px] border-amber-400/20" />
                        <div className="absolute right-5 top-5 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-50 flex items-center gap-1.5">
                            <Crown className="w-3 h-3 text-amber-300" /> Member
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        {!profile ? (
                            <div className="pt-16 text-center">
                                <p className="text-sm text-slate-500">Anda belum masuk. Silakan login untuk melihat profil.</p>
                                <a href="/login" className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                                    <UserCheck className="w-4 h-4" /> Login
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* Avatar + identitas */}
                                <div className="flex items-end justify-between -mt-12">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-24 h-24 rounded-3xl text-4xl font-black text-white flex items-center justify-center border-4 border-white shadow-xl shadow-emerald-700/30">
                                        {initial}
                                    </div>
                                    <div className="pb-1 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide ${isBackOffice ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {isBackOffice ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                            {roleLabel.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <h2 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{profile?.name}</h2>

                                {/* Aksi cepat */}
                                <div className="mt-4 flex gap-2">
                                    <a href="/orders" className="flex-1 flex items-center justify-between gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-800 font-bold px-4 py-3 rounded-2xl text-sm transition-colors">
                                        <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Pesanan Saya</span>
                                        <ChevronRight className="w-4 h-4 text-emerald-400" />
                                    </a>
                                    {isBackOffice && (
                                        <a href="/admin" className="flex-1 flex items-center justify-between gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-3 rounded-2xl text-sm transition-colors">
                                            <span className="flex items-center gap-2"><Store className="w-4 h-4" /> Panel {profile?.role === 'owner' ? 'Owner' : 'Admin'}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                        </a>
                                    )}
                                </div>

                                {/* ===== KARTU POIN MEMBER ===== */}
                                {points && (
                                    <div className="mt-5 relative rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-5 text-white overflow-hidden shadow-lg shadow-orange-500/25">
                                        <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10" />
                                        <div className="absolute right-12 -bottom-16 w-32 h-32 rounded-full bg-white/10" />
                                        <div className="relative">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Saldo Poin</p>
                                                    <p className="text-4xl font-black mt-1 drop-shadow-sm">{points.points.toLocaleString('id-ID')}</p>
                                                    {Number(points.redeem_rate) > 0 && (
                                                        <p className="text-[11px] font-bold opacity-90 mt-0.5">1 poin = Rp {formatIDR(points.redeem_rate)}</p>
                                                    )}
                                                </div>
                                                <span className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                                                    <Coins className="w-8 h-8" />
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-95 mt-3 bg-white/15 rounded-xl px-3 py-2">
                                                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                                Belanja Rp 1.000 = {Number(points.earning_rate) || 1} poin. Tukarkan saat checkout.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ===== Info kontak ===== */}
                                <div className="mt-6 space-y-2.5">
                                    <ProfileRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile.email || '-'} />
                                    <ProfileRow icon={<Phone className="w-4 h-4" />} label="Telepon" value={profile.phone || '-'} />
                                    <ProfileRow icon={<MapPin className="w-4 h-4" />} label="Alamat" value={profile.address || '-'} />
                                </div>

                                {/* ===== Riwayat poin ===== */}
                                {points && Array.isArray(points.ledger) && points.ledger.length > 0 && (
                                    <div className="mt-7">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Riwayat Poin</p>
                                            <Coins className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                                            {points.ledger.slice(0, 5).map(entry => (
                                                <div key={entry.id} className="flex items-center gap-3 p-3.5 hover:bg-slate-50/70 transition-colors">
                                                    <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${entry.amount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {entry.amount > 0
                                                            ? <TrendingUp className="w-4 h-4" />
                                                            : <TrendingDown className="w-4 h-4" />}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-slate-700 truncate">{entry.description || (entry.type === 'earn' ? 'Poin dari pesanan' : 'Tukar poin')}</p>
                                                        <p className="text-[10px] text-slate-400">{new Date(entry.created_at).toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <span className={`text-sm font-black ${entry.amount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleLogout} className="mt-6 w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 font-bold py-3 rounded-2xl text-sm transition-colors">
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
        <div className="flex items-center gap-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100 rounded-2xl px-4 py-3 transition-colors">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-emerald-600 flex items-center justify-center shrink-0">
                {icon}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
            </div>
        </div>
    );
}