// File: src/pages/admin/AdminShippingZonesPage.jsx
import { useState, useEffect } from 'react';
import { Truck, Plus, Pencil, Trash2, Save, X, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';

const formatIDR = (value) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

export default function AdminShippingZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modal add/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', fee: '', is_active: true });

  const fetchZones = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/shipping_zones.php');
      if (response.data && response.data.status === 'success') {
        setZones(response.data.data || []);
      } else {
        setError(response.data?.message || 'Gagal memuat zona ongkir.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', fee: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (zone) => {
    setEditingId(zone.id);
    setForm({ name: zone.name, fee: String(zone.fee), is_active: zone.is_active });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...form, fee: Number(form.fee) || 0 };
      const response = editingId
        ? await api.put('/admin/shipping_zones.php', { ...payload, id: editingId })
        : await api.post('/admin/shipping_zones.php', payload);
      if (response.data && response.data.status === 'success') {
        setNotice(response.data.message || 'Zona ongkir tersimpan.');
        setModalOpen(false);
        fetchZones();
      } else {
        setError(response.data?.message || 'Gagal menyimpan zona.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan zona.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`Hapus zona "${zone.name}"? Produk/order lama tetap aman.`)) return;
    setError('');
    try {
      const response = await api.delete(`/admin/shipping_zones.php?id=${zone.id}`);
      if (response.data && response.data.status === 'success') {
        setNotice(response.data.message || 'Zona dihapus.');
        fetchZones();
      } else {
        setError(response.data?.message || 'Gagal menghapus zona.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus zona.');
    }
  };

  const handleToggleActive = async (zone) => {
    try {
      await api.put('/admin/shipping_zones.php', {
        id: zone.id,
        name: zone.name,
        fee: zone.fee,
        is_active: !zone.is_active,
        sort: zone.sort,
      });
      fetchZones();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengubah status zona.');
    }
  };

  const activeCount = zones.filter(z => z.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" /> Zona Pengiriman
          </h2>
          <p className="text-xs text-slate-500 mt-1">Kelola zona & ongkos kirim yang ditawarkan di halaman checkout</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Zona
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-semibold">⚠️ {error}</div>
      )}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm font-semibold">✓ {notice}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
          <div>
            <p className="text-sm text-slate-500">Total zona</p>
            <p className="text-4xl font-black text-emerald-600">{zones.length}</p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">Zona aktif di checkout</p>
            <p className="text-4xl font-black text-slate-800">{activeCount}</p>
          </div>
          {activeCount === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Tidak ada zona aktif. Pembeli tidak akan bisa memilih ongkir di checkout online.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {loading ? (
            <div className="text-center py-10 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-sm text-slate-400 font-semibold">Memuat zona...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">Zona</th>
                    <th className="p-4">Ongkos Kirim</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {zones.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-400">
                        Belum ada zona pengiriman. Klik "Tambah Zona" untuk membuatnya.
                      </td>
                    </tr>
                  ) : (
                    zones.map((zone, idx) => (
                      <tr key={zone.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{zone.name}</p>
                              <p className="text-[11px] text-slate-400">Urutan #{(zone.sort || idx + 1)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-black text-emerald-700">{formatIDR(zone.fee)}</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleActive(zone)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                              zone.is_active
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title={zone.is_active ? 'Aktif - klik untuk nonaktifkan' : 'Nonaktif - klik untuk aktifkan'}
                          >
                            {zone.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(zone)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                              title="Edit zona"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(zone)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Hapus zona"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT ZONA */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative p-6 border border-slate-100">
            <button onClick={() => setModalOpen(false)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer" title="Tutup">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-slate-800 mb-5 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              {editingId ? 'Edit Zona Pengiriman' : 'Tambah Zona Pengiriman'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="zoneName" className="block text-sm font-semibold text-slate-700 mb-1">Nama Zona</label>
                <input
                  id="zoneName"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Dalam Kota / Luar Kota / Luar Pulau"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="zoneFee" className="block text-sm font-semibold text-slate-700 mb-1">Ongkos Kirim (Rp)</label>
                <input
                  id="zoneFee"
                  type="number"
                  min="0"
                  value={form.fee}
                  onChange={(e) => setForm(prev => ({ ...prev, fee: e.target.value }))}
                  placeholder="Contoh: 15000"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  required
                />
              </div>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded-sm border-slate-300 text-emerald-600 accent-emerald-600 cursor-pointer"
                />
                <span>Aktif di halaman checkout</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm" disabled={saving}>
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-md disabled:opacity-60 text-sm cursor-pointer">
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : (editingId ? 'Update Zona' : 'Tambah Zona')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}