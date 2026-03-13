import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Play, Square, Clock, Banknote, CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function Shift() {
  const { user } = useAuthStore();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [kasAwal, setKasAwal] = useState<number | ''>('');
  const [catatan, setCatatan] = useState('');
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [shiftStats, setShiftStats] = useState({ totalTunai: 0, totalNonTunai: 0, totalTrx: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchShiftData();
  }, [user]);

  const fetchShiftData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Cek shift aktif
      const { data: activeData } = await supabase
        .from('shifts')
        .select('*')
        .eq('kasir_id', user.id)
        .eq('status', 'aktif')
        .maybeSingle();

      setActiveShift(activeData || null);

      if (activeData) {
        // Hitung stats untuk shift aktif
        const { data: txData } = await supabase
          .from('transactions')
          .select('total, metode_pembayaran')
          .eq('kasir_id', user.id)
          .gte('tanggal', activeData.waktu_mulai);

        const tunai = txData?.filter(t => t.metode_pembayaran === 'cash').reduce((s, t) => s + t.total, 0) || 0;
        const nonTunai = txData?.filter(t => t.metode_pembayaran !== 'cash').reduce((s, t) => s + t.total, 0) || 0;
        setShiftStats({ totalTunai: tunai, totalNonTunai: nonTunai, totalTrx: txData?.length || 0 });
      }

      // Riwayat shift selesai
      const { data: history } = await supabase
        .from('shifts')
        .select('*')
        .eq('kasir_id', user.id)
        .eq('status', 'selesai')
        .order('created_at', { ascending: false })
        .limit(5);

      setShiftHistory(history || []);
    } finally {
      setLoading(false);
    }
  };

  const handleMulaiShift = async () => {
    if (!user || typeof kasAwal !== 'number') return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('shifts').insert([{
        kasir_id: user.id,
        kas_awal: kasAwal,
        status: 'aktif'
      }]);
      if (error) throw error;
      setKasAwal('');
      await fetchShiftData();
    } catch (err: any) {
      alert('Gagal memulai shift: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleTutupShift = async () => {
    if (!activeShift) return;
    if (!window.confirm('Apakah Anda yakin ingin menutup shift sekarang?')) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('shifts').update({
        status: 'selesai',
        waktu_selesai: new Date().toISOString(),
        total_tunai: shiftStats.totalTunai,
        total_non_tunai: shiftStats.totalNonTunai,
        total_transaksi: shiftStats.totalTrx,
        catatan,
      }).eq('id', activeShift.id);
      if (error) throw error;
      setCatatan('');
      await fetchShiftData();
    } catch (err: any) {
      alert('Gagal menutup shift: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Memuat data shift...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Manajemen Shift</h1>

      {/* Status Shift Aktif */}
      {activeShift ? (
        <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
          <div className="bg-green-50 p-4 flex items-center gap-3 border-b border-green-100">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-semibold text-green-800">Shift Sedang Berjalan</p>
              <p className="text-xs text-green-600">Mulai: {format(new Date(activeShift.waktu_mulai), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Kas Awal</p>
                <p className="font-bold text-gray-800">Rp {activeShift.kas_awal.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Total Transaksi</p>
                <p className="font-bold text-gray-800">{shiftStats.totalTrx} transaksi</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mb-1">
                  <Banknote className="w-3.5 h-3.5" /> Tunai
                </div>
                <p className="font-bold text-green-700">Rp {shiftStats.totalTunai.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mb-1">
                  <CreditCard className="w-3.5 h-3.5" /> Non-Tunai
                </div>
                <p className="font-bold text-blue-700">Rp {shiftStats.totalNonTunai.toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="bg-primary-50 rounded-lg p-3 text-center mb-4 border border-primary-100">
              <div className="flex items-center justify-center gap-1 text-xs text-primary-600 mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> Total Pendapatan Shift
              </div>
              <p className="text-xl font-extrabold text-primary-700">Rp {(shiftStats.totalTunai + shiftStats.totalNonTunai).toLocaleString('id-ID')}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan saat menutup shift (opsional)</label>
              <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Catatan..." />
            </div>

            <button onClick={handleTutupShift} disabled={processing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50">
              <Square className="w-5 h-5" />
              {processing ? 'Menutup...' : 'Tutup Shift'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Tidak Ada Shift Aktif</h2>
            <p className="text-sm text-gray-500 mt-1">Mulai shift untuk mencatat transaksi Anda hari ini.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Kas Awal (Rp)</label>
            <input type="number" min={0} value={kasAwal}
              onChange={(e) => setKasAwal(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xl font-bold focus:ring-primary-500 focus:border-primary-500"
              placeholder="0" autoFocus />
          </div>
          <button onClick={handleMulaiShift} disabled={processing || kasAwal === ''}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50">
            <Play className="w-5 h-5" />
            {processing ? 'Memulai...' : 'Mulai Shift'}
          </button>
        </div>
      )}

      {/* Riwayat Shift */}
      {shiftHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Riwayat Shift Terakhir</h2>
          </div>
          <div className="divide-y">
            {shiftHistory.map((shift) => (
              <div key={shift.id} className="px-5 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{format(new Date(shift.waktu_mulai), 'dd MMM yyyy')}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(shift.waktu_mulai), 'HH:mm')} - {shift.waktu_selesai ? format(new Date(shift.waktu_selesai), 'HH:mm') : '-'}
                    &nbsp;·&nbsp;{shift.total_transaksi} transaksi
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">Rp {(shift.total_tunai + shift.total_non_tunai).toLocaleString('id-ID')}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">selesai</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
