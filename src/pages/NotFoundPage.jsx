//File: pages/NotFoundPage.jsx
import { ArrowLeft, SearchX } from 'lucide-react';
import Header from '../components/Header';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center text-center">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs mb-6">
                    <SearchX className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">404</h1>
                <p className="mt-2 text-slate-500 text-sm">Halaman yang kamu cari tidak ditemukan atau sudah dipindahkan.</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
                </button>
            </div>
        </div>
    );
}