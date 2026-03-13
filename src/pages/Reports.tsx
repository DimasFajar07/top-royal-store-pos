import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Download, FileText, Printer, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' { interface jsPDF { autoTable: (o: any) => void; } }

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Period = 'daily' | 'weekly' | 'monthly';

export default function Reports() {
  const [period, setPeriod] = useState<Period>('daily');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => { fetchReports(); }, [period]);

  const getPeriodRange = () => {
    const today = new Date();
    if (period === 'daily') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(today, 6 - i);
        return { label: format(d, 'dd MMM', { locale: idLocale }), start: startOfDay(d).toISOString(), end: endOfDay(d).toISOString(), key: format(d, 'yyyy-MM-dd') };
      });
      return { buckets: days, startISO: days[0].start, endISO: days[6].end };
    } else if (period === 'weekly') {
      const weeks = Array.from({ length: 5 }, (_, i) => {
        const w = subWeeks(today, 4 - i);
        const s = startOfWeek(w, { weekStartsOn: 1 });
        const e = endOfWeek(w, { weekStartsOn: 1 });
        return { label: `Mg ${format(s, 'dd/MM', { locale: idLocale })}`, start: s.toISOString(), end: e.toISOString(), key: format(s, 'yyyy-MM-dd') };
      });
      return { buckets: weeks, startISO: weeks[0].start, endISO: weeks[4].end };
    } else {
      const months = Array.from({ length: 6 }, (_, i) => {
        const m = subMonths(today, 5 - i);
        return { label: format(m, 'MMM yyyy', { locale: idLocale }), start: startOfMonth(m).toISOString(), end: endOfMonth(m).toISOString(), key: format(m, 'yyyy-MM') };
      });
      return { buckets: months, startISO: months[0].start, endISO: months[5].end };
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { buckets, startISO, endISO } = getPeriodRange();
      const { data } = await supabase.from('transactions')
        .select('id, tanggal, total, metode_pembayaran, diskon, users(nama)')
        .gte('tanggal', startISO)
        .lte('tanggal', endISO)
        .order('tanggal', { ascending: false });

      const txs = data || [];
      setTransactions(txs);

      // Group by bucket
      const grouped = buckets.map(b => {
        const inBucket = txs.filter(tx => tx.tanggal >= b.start && tx.tanggal <= b.end);
        return { ...b, total: inBucket.reduce((s, t) => s + t.total, 0), count: inBucket.length };
      });

      setChartData({
        labels: grouped.map(b => b.label),
        datasets: [
          { label: 'Penjualan (Rp)', data: grouped.map(b => b.total), backgroundColor: 'rgba(13,148,136,0.7)', borderColor: '#0d9488', borderWidth: 1, borderRadius: 6 },
          { label: 'Jumlah Transaksi', data: grouped.map(b => b.count), backgroundColor: 'rgba(99,102,241,0.6)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 6, yAxisID: 'y2' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = transactions.reduce((s, t) => s + t.total, 0);
  const avgRevenue = transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0;
  const totalTunai = transactions.filter(t => t.metode_pembayaran === 'cash').reduce((s, t) => s + t.total, 0);
  const totalNonTunai = transactions.filter(t => t.metode_pembayaran !== 'cash').reduce((s, t) => s + t.total, 0);

  const periodLabel = { daily: '7 Hari Terakhir', weekly: '5 Minggu Terakhir', monthly: '6 Bulan Terakhir' }[period];

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(transactions.map(tx => ({
      'Tanggal': format(new Date(tx.tanggal), 'dd/MM/yyyy HH:mm'),
      'Kasir': tx.users?.nama || '-',
      'Metode': tx.metode_pembayaran,
      'Diskon (Rp)': tx.diskon || 0,
      'Total (Rp)': tx.total,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `Laporan_${period}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(16); doc.text('Laporan Penjualan - Top Royal Shop', 14, 20);
    doc.setFontSize(11);
    doc.text(`Periode: ${periodLabel}`, 14, 28);
    doc.text(`Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}`, 14, 34);
    doc.text(`Total Transaksi: ${transactions.length}`, 14, 40);
    doc.autoTable({
      startY: 48,
      head: [['No', 'Tanggal', 'Kasir', 'Metode', 'Total']],
      body: transactions.map((tx, i) => [i + 1, format(new Date(tx.tanggal), 'dd/MM/yyyy HH:mm'), tx.users?.nama || '-', tx.metode_pembayaran, `Rp ${tx.total.toLocaleString('id-ID')}`]),
      headStyles: { fillColor: [13, 148, 136] }, theme: 'striped'
    });
    doc.save(`Laporan_${period}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6" id="printable-area">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print, .no-print * { display: none !important; visibility: hidden !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm">
            <Printer className="w-4 h-4" /> Cetak
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="bg-white rounded-xl shadow-sm border p-1 flex gap-1 w-fit no-print">
        {[{ key: 'daily', label: 'Harian (7 Hari)' }, { key: 'weekly', label: 'Mingguan (5 Minggu)' }, { key: 'monthly', label: 'Bulanan (6 Bulan)' }].map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key as Period)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${period === key ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Pendapatan', value: `Rp ${totalRevenue.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Jumlah Transaksi', value: transactions.length, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rata-rata / Transaksi', value: `Rp ${avgRevenue.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Non-Tunai', value: `Rp ${totalNonTunai.toLocaleString('id-ID')}`, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border p-4">
            <div className={`inline-flex p-2 ${bg} rounded-lg mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Grafik Penjualan — {periodLabel}</h2>
        <div className="h-64">
          {!loading && chartData && (
            <Bar data={chartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { position: 'top' as const } },
              scales: {
                y: { beginAtZero: true, ticks: { callback: (v) => 'Rp ' + Number(v).toLocaleString('id-ID') } },
                y2: { position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false } }
              }
            }} />
          )}
        </div>
      </div>

      {/* Metode Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tunai', color: 'border-l-green-500', amount: totalTunai, count: transactions.filter(t => t.metode_pembayaran === 'cash').length },
          { label: 'E-Wallet', color: 'border-l-blue-500', amount: transactions.filter(t => t.metode_pembayaran === 'e-wallet').reduce((s, t) => s + t.total, 0), count: transactions.filter(t => t.metode_pembayaran === 'e-wallet').length },
          { label: 'Transfer', color: 'border-l-violet-500', amount: transactions.filter(t => t.metode_pembayaran === 'transfer').reduce((s, t) => s + t.total, 0), count: transactions.filter(t => t.metode_pembayaran === 'transfer').length },
        ].map(({ label, color, amount, count }) => (
          <div key={label} className={`bg-white rounded-xl shadow-sm border-l-4 ${color} border border-gray-100 p-4`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="font-bold text-gray-800 text-sm truncate">Rp {amount.toLocaleString('id-ID')}</p>
            <p className="text-xs text-gray-400">{count} transaksi</p>
          </div>
        ))}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Detail Transaksi — {periodLabel}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Tanggal & Waktu', 'Kasir', 'Metode', 'Diskon', 'Total'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Memuat...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada transaksi</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-700">{format(new Date(tx.tanggal), 'dd MMM yyyy, HH:mm')}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{tx.users?.nama || '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${tx.metode_pembayaran === 'cash' ? 'bg-green-100 text-green-700' : tx.metode_pembayaran === 'e-wallet' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                      {tx.metode_pembayaran}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-green-600">{tx.diskon > 0 ? `-Rp ${tx.diskon.toLocaleString('id-ID')}` : '-'}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">Rp {tx.total.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
