import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import { Search, Filter, BarChart2, AlertTriangle, CheckCircle, XCircle, History } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

type StokFilter = 'all' | 'menipis' | 'habis' | 'aman';

export default function StockManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StokFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<any | null>(null);
  const [adjustStok, setAdjustStok] = useState(0);
  const [adjustAlasan, setAdjustAlasan] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  useEffect(() => { fetchProducts(); fetchStockLogs(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products')
      .select('id, nama_produk, stok, harga, barcode, categories(nama)')
      .order('stok', { ascending: true });
    setProducts(data || []);
    setLoading(false);
  };

  const fetchStockLogs = async () => {
    const { data } = await supabase.from('stock_logs')
      .select('id, created_at, perubahan, alasan, products(nama_produk)')
      .order('created_at', { ascending: false })
      .limit(30);
    setStockLogs(data || []);
  };

  const getStatus = (stok: number): { label: string; color: string; icon: any } => {
    if (stok === 0) return { label: 'Habis', color: 'text-red-600 bg-red-100', icon: XCircle };
    if (stok <= 5) return { label: 'Menipis', color: 'text-orange-600 bg-orange-100', icon: AlertTriangle };
    return { label: 'Aman', color: 'text-green-600 bg-green-100', icon: CheckCircle };
  };

  const filtered = products.filter(p => {
    const search = p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const statusOk = filterStatus === 'all' || 
      (filterStatus === 'habis' && p.stok === 0) ||
      (filterStatus === 'menipis' && p.stok > 0 && p.stok <= 5) ||
      (filterStatus === 'aman' && p.stok > 5);
    return search && statusOk;
  });

  const productStats = {
    total: products.length,
    habis: products.filter(p => p.stok === 0).length,
    menipis: products.filter(p => p.stok > 0 && p.stok <= 5).length,
    aman: products.filter(p => p.stok > 5).length,
  };

  const handleOpenAdjust = (product: any) => {
    setAdjustingProduct(product);
    setAdjustStok(product.stok);
    setAdjustAlasan('');
    setAdjustModalOpen(true);
  };

  const handleSaveAdjust = async () => {
    if (!adjustingProduct) return;
    setAdjustLoading(true);
    try {
      const selisih = adjustStok - adjustingProduct.stok;
      await supabase.from('products').update({ stok: adjustStok }).eq('id', adjustingProduct.id);
      await supabase.from('stock_logs').insert([{ produk_id: adjustingProduct.id, perubahan: selisih, alasan: adjustAlasan || 'Penyesuaian stok manual' }]);
      setAdjustModalOpen(false);
      await fetchProducts();
      await fetchStockLogs();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Stok Barang</h1>
        <button onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">
          <History className="w-4 h-4" /> {showLogs ? 'Tutup Riwayat' : 'Riwayat Stok'}
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[  
          { key: 'all', label: 'Total Produk', value: productStats.total, color: 'border-l-gray-400' },
          { key: 'aman', label: 'Stok Aman', value: productStats.aman, color: 'border-l-green-500' },
          { key: 'menipis', label: 'Stok Menipis', value: productStats.menipis, color: 'border-l-orange-500' },
          { key: 'habis', label: 'Stok Habis', value: productStats.habis, color: 'border-l-red-500' },
        ].map(({ key, label, value, color }) => (
          <button key={key} onClick={() => setFilterStatus(key as StokFilter)}
            className={clsx('bg-white rounded-xl shadow-sm border-l-4 border border-gray-100 p-4 text-left transition-all hover:shadow-md', color, filterStatus === key && 'ring-2 ring-primary-400')}>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
          </button>
        ))}
      </div>

      {/* Stock Logs (riwayat) */}
      {showLogs && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
            <History className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-700 text-sm">Riwayat Perubahan Stok (30 terakhir)</h2>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {stockLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Belum ada riwayat perubahan stok.</p>
            ) : stockLogs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{log.products?.nama_produk || '-'}</p>
                  <p className="text-xs text-gray-400">{log.alasan || '-'} · {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                <span className={clsx('text-sm font-bold px-2 py-0.5 rounded', log.perubahan > 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100')}>
                  {log.perubahan > 0 ? `+${log.perubahan}` : log.perubahan}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Cari nama produk atau barcode..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-4 h-4" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as StokFilter)}
            className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500">
            <option value="all">Semua Status</option>
            <option value="aman">Stok Aman</option>
            <option value="menipis">Stok Menipis</option>
            <option value="habis">Stok Habis</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Nama Produk', 'Kategori', 'Barcode', 'Harga', 'Stok', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat data stok...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada produk ditemukan.</td></tr>
              ) : filtered.map(product => {
                const status = getStatus(product.stok);
                const StatusIcon = status.icon;
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{product.nama_produk}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{product.categories?.nama || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-400 font-mono">{product.barcode || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">Rp {product.harga.toLocaleString('id-ID')}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-800">{product.stok}</td>
                    <td className="px-5 py-3">
                      <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full', status.color)}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleOpenAdjust(product)}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 hover:border-primary-400 px-2.5 py-1.5 rounded-lg transition-colors">
                        <BarChart2 className="w-3.5 h-3.5" /> Sesuaikan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      <Modal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Sesuaikan Stok">
        {adjustingProduct && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-800">{adjustingProduct.nama_produk}</p>
              <p className="text-sm text-gray-500">Stok saat ini: <span className="font-bold text-gray-800">{adjustingProduct.stok}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stok Baru</label>
              <input type="number" min={0} value={adjustStok}
                onChange={e => setAdjustStok(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-2xl font-bold text-center focus:ring-primary-500 focus:border-primary-500" />
              <p className={clsx('mt-1.5 text-sm font-medium text-center', adjustStok > adjustingProduct.stok ? 'text-green-600' : adjustStok < adjustingProduct.stok ? 'text-red-600' : 'text-gray-400')}>
                {adjustStok > adjustingProduct.stok ? `+${adjustStok - adjustingProduct.stok} penambahan` : adjustStok < adjustingProduct.stok ? `${adjustStok - adjustingProduct.stok} pengurangan` : 'Stok tidak berubah'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
              <input type="text" value={adjustAlasan} onChange={e => setAdjustAlasan(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Contoh: Barang rusak, koreksi stok, retur..." />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveAdjust} disabled={adjustLoading || adjustStok === adjustingProduct.stok}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50">
                {adjustLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setAdjustModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
                Batal
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
