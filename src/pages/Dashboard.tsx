import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ShoppingCart, AlertCircle, Package, Users, TrendingUp, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSalesToday: 0, totalTxToday: 0, lowStockCount: 0, totalProducts: 0, totalCustomers: 0, avgTxToday: 0 });
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const startToday = startOfDay(today).toISOString();
      const endToday = endOfDay(today).toISOString();

      // Stats hari ini
      const { data: todayTx } = await supabase.from('transactions').select('total').gte('tanggal', startToday).lte('tanggal', endToday);
      const totalSales = todayTx?.reduce((s, t) => s + t.total, 0) || 0;
      const txCount = todayTx?.length || 0;

      // Produk
      const { data: products } = await supabase.from('products').select('id, nama_produk, stok').order('stok', { ascending: true });
      const lowStocks = products?.filter(p => p.stok <= 5) || [];

      // Pelanggan
      const { count: custCount } = await supabase.from('customers').select('id', { count: 'exact', head: true });

      setStats({
        totalSalesToday: totalSales,
        totalTxToday: txCount,
        lowStockCount: lowStocks.length,
        totalProducts: products?.length || 0,
        totalCustomers: custCount || 0,
        avgTxToday: txCount > 0 ? Math.round(totalSales / txCount) : 0,
      });
      setLowStockProducts(lowStocks.slice(0, 5));

      // Transaksi terbaru
      const { data: recent } = await supabase.from('transactions')
        .select('id, tanggal, total, metode_pembayaran, users(nama)')
        .order('tanggal', { ascending: false })
        .limit(5);
      setRecentTx(recent || []);

      // Chart 7 hari
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(today, 6 - i);
        return { date: d, dateStr: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE dd/MM', { locale: idLocale }), total: 0, count: 0 };
      });
      const { data: weeklyTx } = await supabase.from('transactions').select('tanggal, total').gte('tanggal', startOfDay(last7[0].date).toISOString()).lte('tanggal', endToday);
      weeklyTx?.forEach(tx => {
        const dateStr = format(new Date(tx.tanggal), 'yyyy-MM-dd');
        const day = last7.find(d => d.dateStr === dateStr);
        if (day) { day.total += tx.total; day.count += 1; }
      });

      setChartData({
        labels: last7.map(d => d.label),
        datasets: [{
          label: 'Penjualan (Rp)',
          data: last7.map(d => d.total),
          borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.12)',
          pointBackgroundColor: '#0d9488', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5,
          tension: 0.4, fill: true
        }]
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Penjualan Hari Ini', value: `Rp ${stats.totalSalesToday.toLocaleString('id-ID')}`, icon: DollarSign, color: 'bg-teal-50 text-teal-600', iconBg: 'bg-teal-100' },
    { label: 'Transaksi Hari Ini', value: stats.totalTxToday, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100' },
    { label: 'Rata-rata / Transaksi', value: `Rp ${stats.avgTxToday.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'bg-violet-50 text-violet-600', iconBg: 'bg-violet-100' },
    { label: 'Total Produk', value: stats.totalProducts, icon: Package, color: 'bg-orange-50 text-orange-600', iconBg: 'bg-orange-100' },
    { label: 'Pelanggan Terdaftar', value: stats.totalCustomers, icon: Users, color: 'bg-pink-50 text-pink-600', iconBg: 'bg-pink-100' },
    { label: 'Stok Menipis', value: stats.lowStockCount, icon: AlertCircle, color: 'bg-red-50 text-red-600', iconBg: 'bg-red-100' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: idLocale })}</p>
        </div>
        <Link to="/pos" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 text-sm">
          <ShoppingCart className="w-4 h-4" /> Buka Kasir
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, iconBg }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${iconBg}`}>
              <Icon className={`w-4 h-4 ${color.split(' ')[1]}`} />
            </div>
            <p className="text-xs text-gray-500 mb-0.5 leading-tight">{label}</p>
            <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">Grafik Penjualan 7 Hari Terakhir</h2>
            <Link to="/reports" className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
              Lihat Laporan <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="h-56">
            {chartData && (
              <Line data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'Rp ' + Number(v).toLocaleString('id-ID') } } }
              }} />
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Stok Menipis
            </h2>
            <Link to="/stock" className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
              Kelola <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Semua stok aman ✓</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 truncate flex-1 mr-2">{p.nama_produk}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${p.stok === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {p.stok === 0 ? 'Habis' : `Sisa ${p.stok}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-600" /> Transaksi Terbaru
          </h2>
          <Link to="/history" className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentTx.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada transaksi hari ini.</p>
        ) : (
          <div className="divide-y">
            {recentTx.map(tx => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{tx.users?.nama || 'Kasir'}</p>
                  <p className="text-xs text-gray-400">{format(new Date(tx.tanggal), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">Rp {tx.total.toLocaleString('id-ID')}</p>
                  <span className="text-xs bg-primary-100 text-primary-700 rounded px-1.5 py-0.5 uppercase">{tx.metode_pembayaran}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
