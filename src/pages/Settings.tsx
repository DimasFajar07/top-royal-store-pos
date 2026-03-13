import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Store, Phone, MapPin, FileText } from 'lucide-react';

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    nama_toko: 'Top Royal Shop',
    alamat: '',
    nomor_hp: '',
    catatan_struk: 'Terima kasih telah berbelanja!',
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
    if (data) {
      setSettingsId(data.id);
      setFormData({
        nama_toko: data.nama_toko || 'Top Royal Shop',
        alamat: data.alamat || '',
        nomor_hp: data.nomor_hp || '',
        catatan_struk: data.catatan_struk || 'Terima kasih!',
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (settingsId) {
        await supabase.from('settings').update({ ...formData, updated_at: new Date().toISOString() }).eq('id', settingsId);
      } else {
        await supabase.from('settings').insert([formData]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await fetchSettings();
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Memuat pengaturan...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pengaturan Toko</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border divide-y">
        {/* Identitas Toko */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-600" /> Identitas Toko
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Toko</label>
              <input type="text" required value={formData.nama_toko}
                onChange={(e) => setFormData({ ...formData, nama_toko: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Top Royal Shop" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Alamat
              </label>
              <textarea value={formData.alamat} rows={2}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Jl. Contoh No. 123, Kota" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Nomor Telepon
              </label>
              <input type="tel" value={formData.nomor_hp}
                onChange={(e) => setFormData({ ...formData, nomor_hp: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="0812-3456-7890" />
            </div>
          </div>
        </div>

        {/* Struk */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-600" /> Pengaturan Struk
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan di Bagian Bawah Struk</label>
            <textarea value={formData.catatan_struk} rows={3}
              onChange={(e) => setFormData({ ...formData, catatan_struk: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Terima kasih telah berbelanja!" />
          </div>
        </div>

        {/* Preview Struk */}
        <div className="p-5 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Preview Struk</h2>
          <div className="bg-white border border-dashed rounded-lg p-4 font-mono text-xs max-w-[220px] mx-auto text-center text-gray-700">
            <p className="font-bold text-sm uppercase">{formData.nama_toko || 'Nama Toko'}</p>
            {formData.alamat && <p className="text-gray-500 mt-0.5">{formData.alamat}</p>}
            {formData.nomor_hp && <p className="text-gray-500">Telp: {formData.nomor_hp}</p>}
            <p className="border-b border-dashed my-2 border-gray-300"></p>
            <p className="text-gray-400 italic text-[10px]">{formData.catatan_struk || '-'}</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="p-5">
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan!' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}
