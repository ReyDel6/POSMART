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
        <div className={`min-h-screen w-full flex bg-cream ${isMirror ? 'flex-row-reverse' : ''}`}>
            {/* ===== PANEL BRANDING (desktop) ===== */}
            <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-ink text-cream flex-col justify-between p-12">
                {/* dekorasi */}
                <div className={`absolute -top-24 w-80 h-80 rounded-full border-[40px] border-lime/10 ${isMirror ? '-left-24' : '-right-24'}`} />
                <div className={`absolute -bottom-32 w-96 h-96 rounded-full border-[48px] border-lime/10 ${isMirror ? '-right-20' : '-left-20'}`} />
                <div className={`absolute top-1/3 w-24 h-24 rounded-3xl bg-lime/10 rotate-12 ${isMirror ? 'left-10' : 'right-10'}`} />

                {/* logo */}
                <div className="relative flex items-center gap-3">
                    <div className="p-2.5 bg-lime text-ink border-2 border-lime shadow-[3px_3px_0_#CBF169] rounded-2xl">
                        <Store className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-black text-cream text-lg tracking-tight leading-none">
                            POS<span className="text-lime">Mart</span>
                        </p>
                        <p className="text-[11px] text-cream/60 font-medium mt-0.5">Belanja sembako murah & dekat.</p>
                    </div>
                </div>

                {/* headline */}
                <div className="relative space-y-4">
                    <span className="inline-flex items-center gap-1.5 bg-lime text-ink border-2 border-lime text-xs font-black px-3 py-1 rounded-full">
                        Daftar & mulai belanja cepat
                    </span>
                    <h2 className="text-4xl font-black leading-tight tracking-tight">
                        Belanja Sembako
                        <br /> Murah & <span className="bg-lime text-ink px-1.5 box-decoration-clone">Nyaman</span>
                    </h2>
                    <p className="text-cream/60 text-sm max-w-sm">
                        Penuhi kebutuhan harian rumah tangga dengan harga hemat, antar cepat, dan tetap segar.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        {FEATURES.map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="bg-[#22211E] rounded-2xl p-3.5 border-2 border-lime/30">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Icon className="w-4 h-4 text-lime" />
                                    <span className="text-xs font-black">{label}</span>
                                </div>
                                <p className="text-[11px] text-cream/60 leading-snug">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative text-[11px] text-cream/40">
                    © {new Date().getFullYear()} POSMart Fresh · Minimarket digital Anda
                </p>
            </div>

            {/* ===== FORM SIDE ===== */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
                <a href="/" className="absolute top-5 left-5 p-2.5 bg-white rounded-full border-2 border-ink shadow-[2px_2px_0_#161616] hover:bg-lime transition-colors" aria-label="Kembali ke beranda">
                    <ArrowLeft className="w-5 h-5 text-ink" />
                </a>

                <div className="absolute top-6 right-5 lg:hidden flex items-center gap-2">
                    <div className="p-1.5 bg-ink border-2 border-ink shadow-[2px_2px_0_#CBF169] rounded-lg text-lime">
                        <Store className="w-4 h-4" />
                    </div>
                    <span className="text-base font-black text-ink tracking-tight">
                        POS<span className="text-coral">Mart</span>
                    </span>
                </div>

                {children}
            </div>
        </div>
    );
}