// File: src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import {
    Mail, Phone, MapPin, LogOut, Store, ShieldCheck, UserCheck, Coins,
    TrendingUp, TrendingDown, ShoppingBag, ChevronRight, Sparkles, Crown,
    History, BadgeCheck,
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

    const ledger = Array.isArray(points?.ledger) ? points.ledger : [];
    const totalEarned = ledger.filter(e => e.amount > 0).reduce((a, e) => a + Number(e.amount), 0);
    const totalSpent = Math.abs(ledger.filter(e => e.amount < 0).reduce((a, e) => a + Number(e.amount), 0));
    const LEVEL_TARGET = 1000;
    const levelPct = Math.min(100, Math.round((totalEarned / LEVEL_TARGET) * 100));

    const completeness = [profile?.email, profile?.phone, profile?.address].filter(Boolean).length;
    const completenessPct = Math.round((completeness / 3) * 100);

    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            <Header />

            <div className="max-w-md mx-auto px-4 py-8">
                <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden">

                    {/* ===== Header profil ===== */}
                    <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 h-32 relative overflow-hidden">
                        <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full border-[30px] border-white/10" />
                        <div className="absolute -left-10 -bottom-20 w-48 h-48 rounded-full border-[24px] border-amber-400/20" />
                        <div className="absolute left-16 top-12 w-3 h-3 rounded-full bg-white/20" />
                        <div className="absolute left-28 top-5 w-1.5 h-1.5 rounded-full bg-amber-300/60" />
                        <div className="absolute right-20 bottom-8 w-2 h-2 rounded-full bg-white/25" />
                        <div className="absolute right-5 top-5 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-50 flex items-center gap-1.5">
                            <Crown className="w-3 h-3 text-amber-300" /> Member
                        </div>
                    </div>

                    <div className="px-6 pb-7 -mt-16 relative">
                        {!profile ? (
                            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
                                <p className="text-sm text-slate-500">Anda belum masuk. Silakan login untuk melihat profil.</p>
                                <a href="/login" className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                                    <UserCheck className="w-4 h-4" /> Login
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* Avatar + identitas */}
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 w-24 h-24 rounded-3xl text-4xl font-black text-white flex items-center justify-center ring-4 ring-white shadow-xl shadow-emerald-700/30">
                                            {initial}
                                        </div>
                                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" title="Aktif" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide shadow-sm ${isBackOffice ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {isBackOffice ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                            {roleLabel.toUpperCase()}
                                        </span>
                                        <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight truncate">{profile?.name}</h2>
                                        <p className="text-xs text-slate-400 font-medium truncate">{profile?.email || 'Belum melengkapi email'}</p>
                                    </div>
                                </div>

                                {/* ===== Stats band ===== */}
                                <div className="mt-6 grid grid-cols-3 gap-2">
                                    <StatBox label="Saldo Poin" value={points ? points.points.toLocaleString('id-ID') : '-'} accent="text-amber-600" />
                                    <StatBox label="Terkumpul" value={totalEarned.toLocaleString('id-ID')} accent="text-emerald-600" />
                                    <StatBox label="Sudah Ditukar" value={totalSpent.toLocaleString('id-ID')} accent="text-slate-700" />
                                </div>

                                {/* ===== Level meter ===== */}
                                {points && ledger.length > 0 && (
                                    <div className="mt-3 bg-amber-50/70 border border-amber-100 rounded-2xl px-4 py-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-[11px] font-black text-amber-700 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5" /> Menuju 1.000 poin
                                            </p>
                                            <p className="text-[11px] font-black text-amber-700 tabular-nums">{levelPct}%</p>
                                        </div>
                                        <div className="h-2 bg-amber-200/70 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${levelPct}%` }} />
                                        </div>
                                    </div>
                                )}

                                {/* ===== Kartu poin member ===== */}
                                {points && (
                                    <div className="mt-4 relative rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-5 text-white overflow-hidden shadow-lg shadow-orange-500/25">
                                        <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-white/10" />
                                        <div className="absolute left-1/2 -bottom-20 w-52 h-52 rounded-full bg-white/10" />
                                        <div className="relative">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Member Card · POSMart</p>
                                                    <p className="text-[11px] font-semibold opacity-80 mt-0.5">{profile?.name}</p>
                                                </div>
                                                <span className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center rotate-6">
                                                    <Coins className="w-7 h-7" />
                                                </span>
                                            </div>
                                            <p className="mt-4 text-lg font-black tracking-widest tabular-nums">{String(points.points).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</p>
                                            <p className="text-[10px] font-bold uppercase opacity-80">Saldo Poin</p>
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-95 mt-3 bg-white/15 rounded-xl px-3 py-2 backdrop-blur">
                                                <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-amber-100" />
                                                {Number(points.redeem_rate) > 0 ? `Tukar poin saat checkout · 1 poin = Rp ${formatIDR(points.redeem_rate)}` : 'Tukarkan poin saat checkout'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ===== Kelengkapan profil ===== */}
                                {completeness < 3 && (
                                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-[11px] font-black text-slate-500 flex items-center gap-1.5">
                                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /> Lengkapi profil kamu
                                            </p>
                                            <p className="text-[11px] font-black text-slate-400 tabular-nums">{completenessPct}%</p>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${completenessPct}%` }} />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1.5">Lengkapi email, telepon, dan alamat untuk checkout lebih cepat.</p>
                                    </div>
                                )}

                                {/* ===== Menu ===== */}
                                <div className="mt-7">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 px-1">Menu Saya</p>
                                    <div className="border border-slate-100 rounded-3xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                                        <MenuRow icon={<ShoppingBag className="w-4 h-4" />} label="Pesanan Saya" sub="Lacak dan cek riwayat belanja" href="/orders" />
                                        {isBackOffice && (
                                            <MenuRow icon={<Store className="w-4 h-4" />} label={`Panel ${profile?.role === 'owner' ? 'Owner' : 'Admin'}`} sub="Kelola toko, produk, dan laporan" href="/admin" />
                                        )}
                                        {ledger.length > 0 && (
                                            <a href="#riwayat-poin" className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-emerald-50/60 transition-colors">
                                                <span className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                    <History className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 text-left min-w-0">
                                                    <p className="text-sm font-bold text-slate-800">Riwayat Poin</p>
                                                    <p className="text-[11px] text-slate-400">{ledger.length} transaksi poin</p>
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* ===== Info kontak ===== */}
                                <div className="mt-7">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 px-1">Data Kontak</p>
                                    <div className="space-y-2.5">
                                        <ProfileRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile.email || 'Belum diisi'} />
                                        <ProfileRow icon={<Phone className="w-4 h-4" />} label="Telepon" value={profile.phone || 'Belum diisi'} />
                                        <ProfileRow icon={<MapPin className="w-4 h-4" />} label="Alamat" value={profile.address || 'Belum diisi'} />
                                    </div>
                                </div>

                                {/* ===== Riwayat poin ===== */}
                                {ledger.length > 0 && (
                                    <div id="riwayat-poin" className="mt-7 scroll-mt-24">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 px-1">Riwayat Poin</p>
                                        <div className="border border-slate-100 rounded-3xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                                            {ledger.slice(0, 5).map(entry => (
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
                                                    <span className={`text-sm font-black tabular-nums ${entry.amount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleLogout} className="mt-7 w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 font-bold py-3.5 rounded-2xl text-sm transition-colors shadow-sm">
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

function StatBox({ label, value, accent }) {
    return (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-3 text-center">
            <p className={`text-base font-black tabular-nums ${accent}`}>{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{label}</p>
        </div>
    );
}

function MenuRow({ icon, label, sub, href }) {
    return (
        <a href={href} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-emerald-50/60 transition-colors">
            <span className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                {icon}
            </span>
            <span className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-slate-800">{label}</p>
                <p className="text-[11px] text-slate-400">{sub}</p>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
        </a>
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