import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Users, Star, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ nama: '', nomor_hp: '', email: '' });
  const [detailCustomer, setDetailCustomer] = useState<any | null>(null);
  const [customerTx, setCustomerTx] = useState<any[]>([]);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('total_transaksi', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  const handleOpen = (customer?: any) => {
    if (customer) {
      setEditing(customer);
      setFormData({ nama: customer.nama, nomor_hp: customer.nomor_hp || '', email: customer.email || '' });
    } else {
      setEditing(null);
      setFormData({ nama: '', nomor_hp: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editing) {
        await supabase.from('customers').update(formData).eq('id', editing.id);
      } else {
        await supabase.from('customers').insert([formData]);
      }
      setIsModalOpen(false);
      await fetchCustomers();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus pelanggan ini?')) return;
    await supabase.from('customers').delete().eq('id', id);
    setCustomers(c => c.filter(x => x.id !== id));
  };

  const handleViewDetail = async (customer: any) => {
    setDetailCustomer(customer);
    const { data } = await supabase.from('transactions')
      .select('id, tanggal, total, metode_pembayaran')
      .eq('customer_id', customer.id)
      .order('tanggal', { ascending: false })
      .limit(10);
    setCustomerTx(data || []);
  };

  const getMemberBadge = (totalTrx: number) => {
    if (totalTrx >= 20) return { label: 'Gold Member', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    if (totalTrx >= 10) return { label: 'Silver Member', color: 'bg-gray-100 text-gray-600 border-gray-300' };
    if (totalTrx >= 3) return { label: 'Bronze Member', color: 'bg-orange-100 text-orange-700 border-orange-300' };
    return { label: 'Member Baru', color: 'bg-blue-50 text-blue-600 border-blue-200' };
  };

  const filtered = customers.filter(c =>
    c.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nomor_hp && c.nomor_hp.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCustomers = customers.length;
  const goldMembers = customers.filter(c => c.total_transaksi >= 20).length;
  const silverMembers = customers.filter(c => c.total_transaksi >= 10 && c.total_transaksi < 20).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Pelanggan & Member</h1>
        <button onClick={() => handleOpen()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Pelanggan', value: totalCustomers, icon: Users, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Gold Member', value: goldMembers, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Silver Member', value: silverMembers, icon: Star, color: 'text-gray-500', bg: 'bg-gray-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Cari nama, no. HP, atau email..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500" />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Pelanggan', 'Kontak', 'Level', 'Poin', 'Transaksi', 'Aksi'].map(h => (
                  <th key={h} className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 italic">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center p-6">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-inner">
                      <Users className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Tidak ada hasil</h3>
                    <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">Data tidak ditemukan atau belum ada pelanggan terdaftar.</p>
                    <button onClick={() => handleOpen()} className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 shadow-lg shadow-primary-200 text-sm font-bold transition-all active:scale-95">
                      <Plus className="w-4 h-4" /> Tambah Pelanggan
                    </button>
                  </div>
                </td></tr>
              ) : filtered.map(c => {
                const badge = getMemberBadge(c.total_transaksi || 0);
                return (
                  <tr key={c.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-primary-100">
                          {c.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{c.nama}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Customer ID: {c.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {c.nomor_hp && <div className="flex items-center gap-2 text-xs text-gray-600 font-medium"><Phone className="w-3.5 h-3.5 text-primary-500" /> {c.nomor_hp}</div>}
                        {c.email && <div className="flex items-center gap-2 text-[11px] text-gray-400"><Mail className="w-3.5 h-3.5" /> {c.email}</div>}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm ${badge.color}`}>
                        <Star className="w-3 h-3 fill-current" /> {badge.label}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-primary-700">
                          {c.poin || 0}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Loyalty Points</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-800">{c.total_transaksi || 0}</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Trx</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleViewDetail(c)} title="Riwayat" className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpen(c)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Nama Lengkap', field: 'nama', type: 'text', required: true, placeholder: 'Nama pelanggan' },
            { label: 'Nomor HP / WhatsApp', field: 'nomor_hp', type: 'tel', required: false, placeholder: '0812-xxxx-xxxx' },
            { label: 'Email (opsional)', field: 'email', type: 'email', required: false, placeholder: 'email@contoh.com' },
          ].map(({ label, field, type, required, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} required={required} placeholder={placeholder}
                value={(formData as any)[field]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={formLoading}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
              {formLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Pelanggan */}
      <Modal isOpen={!!detailCustomer} onClose={() => setDetailCustomer(null)} title={`Riwayat — ${detailCustomer?.nama}`}>
        {detailCustomer && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                {detailCustomer.nama.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{detailCustomer.nama}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getMemberBadge(detailCustomer.total_transaksi || 0).color}`}>
                    {getMemberBadge(detailCustomer.total_transaksi || 0).label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold text-primary-600 bg-primary-50 border border-primary-200">
                    {detailCustomer.poin || 0} Poin
                  </span>
                </div>
              </div>
            </div>
            {customerTx.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">Belum ada riwayat transaksi.</p>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto border rounded-lg">
                {customerTx.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Rp {tx.total.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-gray-400">{format(new Date(tx.tanggal), 'dd MMM yyyy HH:mm', { locale: idLocale })}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">{tx.metode_pembayaran}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
