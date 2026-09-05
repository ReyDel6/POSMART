// File: src/pages/admin/AdminUsersPage.jsx
import { useState } from 'react';
import { Users, UserPlus, ShieldCheck, UserCheck, Mail } from 'lucide-react';

export default function AdminUsersPage() {
    const [users, setUsers] = useState([
        { id: 1, name: 'Admin POSMart', email: 'admin@posmart.com', role: 'admin', phone: '08123456789' },
        { id: 2, name: 'Cashier POSMart', email: 'cashier@posmart.com', role: 'cashier', phone: '08129999888' },
        { id: 3, name: 'Budi Kasir Pagi', email: 'budi@posmart.com', role: 'cashier', phone: '08137777666' }
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-red-600" /> Kelola Pengguna & Kasir
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Daftar staf, kasir, dan administrator akses POSMart</p>
                </div>
                <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    <UserPlus className="w-4 h-4" /> Tambah Staf Baru
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                        <tr>
                            <th className="p-4">Nama Staf</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Telepon</th>
                            <th className="p-4">Hak Akses (Role)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                                        {u.name.charAt(0)}
                                    </div>
                                    {u.name}
                                </td>
                                <td className="p-4 text-slate-600 flex items-center gap-1.5 pt-6">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {u.email}
                                </td>
                                <td className="p-4 font-mono text-xs text-slate-500">{u.phone}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                        u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {u.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
