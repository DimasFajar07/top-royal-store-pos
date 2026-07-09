import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Users, Star, ShoppingBag, UserPlus } from 'lucide-react';
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
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800">Pelanggan & Member</h1>
        <button onClick={() => handleOpen()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-lg border hover:bg-slate-100 hover:text-slate-800 text-sm font-semibold transition-all">
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Total Pelanggan', value: totalCustomers, icon: Users, color: 'text-slate-700', bg: 'bg-white' },
          { label: 'Gold Member', value: goldMembers, icon: Star, color: 'text-yellow-500', bg: 'bg-white' },
          { label: 'Silver Member', value: silverMembers, icon: Star, color: 'text-slate-400', bg: 'bg-white' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-4`}>
            <div className={`p-4 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-xs tracking-wide font-medium text-slate-500 uppercase mb-1">{label}</p>
              <p className="text-2xl font-black text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
          <input type="text" placeholder="Cari nama, no. HP, atau email.."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-transparent rounded-xl text-[15px] focus:ring-0 focus:border-transparent outline-none placeholder:text-slate-300 text-slate-700" />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                {['Pelanggan', 'Kontak', 'Member Level', 'Poin', 'Total Transaksi', 'Aksi'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest ${i===0?'pl-8':''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Pencarian kosong</h3>
                    <p className="text-sm text-gray-500 mb-4">Belum ada pelanggan yang terdaftar atau cocok dengan pencarian.</p>
                    <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-semibold transition-colors">
                      <Plus className="w-4 h-4" /> Tambah Pelanggan Baru
                    </button>
                  </div>
                </td></tr>
              ) : filtered.map(c => {
                const badge = getMemberBadge(c.total_transaksi || 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap pl-8">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-slate-800 w-5 text-center">{c.nama.charAt(0).toUpperCase()}</span>
                        <p className="text-[13px] font-bold text-slate-700">{c.nama}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {c.nomor_hp && <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Phone className="w-3 h-3 text-slate-400" /> {c.nomor_hp}</div>}
                        {c.email && <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><Mail className="w-3 h-3 text-slate-300" /> {c.email}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${
                        c.total_transaksi >= 20 ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                        c.total_transaksi >= 10 ? 'bg-slate-50 text-slate-500 border-slate-200' :
                        c.total_transaksi >= 3 ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        'bg-blue-50 text-blue-500 border-blue-200'
                      }`}>
                        <Star className="w-3 h-3" /> {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center font-bold text-slate-800 text-xs">
                        {c.poin || 0} Pts
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800">{c.total_transaksi || 0}×</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => handleViewDetail(c)} title="Lihat Riwayat" className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                          <ShoppingBag className="w-[15px] h-[15px]" />
                        </button>
                        <button onClick={() => handleOpen(c)} className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                          <Edit2 className="w-[15px] h-[15px]" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="w-[15px] h-[15px]" />
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="px-1 py-2 space-y-5">
          <div className="flex items-center gap-2.5 mb-6">
            <UserPlus className="w-6 h-6 text-indigo-700" />
            <h2 className="text-xl font-bold text-[#0f172a]">{editing ? 'Edit Member' : 'Daftar Member Baru'}</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nama Lengkap</label>
            <input type="text" required placeholder="Contoh: Andi Wijaya"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder:text-gray-400" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nomor WhatsApp</label>
            <input type="tel" required placeholder="0812..."
              value={formData.nomor_hp}
              onChange={(e) => setFormData({ ...formData, nomor_hp: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder:text-gray-400" />
          </div>

          <div className="pt-3">
            <button type="submit" disabled={formLoading}
              className="w-full py-3.5 bg-[#0f172a] text-white rounded-lg font-bold text-[15px] hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm tracking-wide">
              {formLoading ? 'Menyimpan...' : 'Simpan Member'}
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
