//File: pages/NotFoundPage.jsx
import { ArrowLeft, SearchX } from 'lucide-react';
import Header from '../components/Header';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-cream font-sans antialiased text-ink">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center text-center">
                <div className="p-4 rounded-2xl bg-white border-2 border-ink shadow-[4px_4px_0_#161616] mb-6">
                    <SearchX className="w-12 h-12 text-coral" />
                </div>
                <h1 className="text-6xl font-black text-ink tracking-tight">404</h1>
                <p className="mt-2 text-slate-500 text-sm">Halaman yang kamu cari tidak ditemukan atau sudah dipindahkan.</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-cream text-sm font-black border-2 border-ink shadow-[3px_3px_0_#161616] hover:bg-slate-900 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 text-lime" /> Kembali ke Beranda
                </button>
            </div>
        </div>
    );
}