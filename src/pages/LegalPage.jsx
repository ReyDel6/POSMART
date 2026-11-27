import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

export default function LegalPage() {
    const { pathname } = useLocation();
    const isPrivacy = pathname === '/privacy';

    return (
        <AuthLayout>
            <article className="w-full max-w-2xl bg-white rounded-3xl border-2 border-ink shadow-[8px_8px_0_#161616] p-7 sm:p-10">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">POSMart</p>
                <h1 className="mt-2 text-2xl font-black text-ink">
                    {isPrivacy ? 'Kebijakan Privasi' : 'Syarat & Ketentuan'}
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                    {isPrivacy
                        ? 'POSMart menggunakan data akun, kontak, dan alamat untuk memproses pesanan, menyediakan layanan member, serta meningkatkan pengalaman belanja. Data tidak dijual kepada pihak lain.'
                        : 'Dengan menggunakan POSMart, Anda menyetujui penggunaan layanan secara wajar, memberikan data yang benar, dan menjaga keamanan akses akun Anda.'}
                </p>
                <Link to="/register" className="mt-6 inline-flex text-sm font-black text-ink underline underline-offset-2 hover:text-slate-600">
                    Kembali ke pendaftaran
                </Link>
            </article>
        </AuthLayout>
    );
}
