// File: src/components/AuthLayout.jsx
import { Store, ArrowLeft, Truck, Leaf, RotateCcw, HandCoins } from 'lucide-react';

const FEATURES = [
    { icon: Truck, label: 'Delivery Kilat', desc: 'Antar langsung ke rumah' },
    { icon: Leaf, label: 'Produk Segar', desc: 'Jaminan tanggal kedaluwarsa aman' },
    { icon: RotateCcw, label: 'Return Mudah', desc: 'Cukup bawa struk toko' },
    { icon: HandCoins, label: 'Member Untung', desc: 'Kumpulkan koin belanja' },
];

export default function AuthLayout({ children, panelSide = 'left' }) {
    const isMirror = panelSide === 'right';

    return (
        <div className={`min-h-screen w-full flex bg-slate-50 ${isMirror ? 'flex-row-reverse' : ''}`}>
            {/* ===== PANEL BRANDING (desktop) ===== */}
            <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-linear-to-br from-green-800 via-green-700 to-green-500 text-white flex-col justify-between p-12">
                {/* dekorasi */}
                <div className={`absolute -top-24 w-80 h-80 rounded-full border-[40px] border-white/10 ${isMirror ? '-left-24' : '-right-24'}`} />
                <div className={`absolute -bottom-32 w-96 h-96 rounded-full border-[48px] border-white/10 ${isMirror ? '-right-20' : '-left-20'}`} />
                <div className={`absolute top-1/3 w-24 h-24 rounded-3xl bg-white/10 rotate-12 ${isMirror ? 'left-10' : 'right-10'}`} />

                {/* logo */}
                <div className="relative flex items-center gap-3">
                    <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl">
                        <Store className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="font-black text-white text-lg tracking-tight leading-none">
                            POS<span className="text-yellow-300">Mart</span>
                        </p>
                        <p className="text-[11px] text-green-100 font-medium mt-0.5">Belanja sembako murah & dekat.</p>
                    </div>
                </div>

                {/* headline */}
                <div className="relative space-y-4">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                        Daftar & mulai belanja cepat
                    </span>
                    <h2 className="text-4xl font-black leading-tight tracking-tight">
                        Belanja Sembako
                        <br /> Murah & Nyaman
                    </h2>
                    <p className="text-green-100 text-sm max-w-sm">
                        Penuhi kebutuhan harian rumah tangga dengan harga hemat, antar cepat, dan tetap segar.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        {FEATURES.map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Icon className="w-4 h-4 text-yellow-300" />
                                    <span className="text-xs font-bold">{label}</span>
                                </div>
                                <p className="text-[11px] text-green-100 leading-snug">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative text-[11px] text-green-200/80">
                    © {new Date().getFullYear()} POSMart Fresh · Minimarket digital Anda
                </p>
            </div>

            {/* ===== FORM SIDE ===== */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
                <a href="/" className="absolute top-5 left-5 p-2.5 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors" aria-label="Kembali ke beranda">
                    <ArrowLeft className="w-5 h-5 text-slate-700" />
                </a>

                <div className="absolute top-6 right-5 lg:hidden flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
                        <Store className="w-4 h-4" />
                    </div>
                    <span className="text-base font-black text-slate-900 tracking-tight">
                        POS<span className="text-emerald-600">Mart</span>
                    </span>
                </div>

                {children}
            </div>
        </div>
    );
}