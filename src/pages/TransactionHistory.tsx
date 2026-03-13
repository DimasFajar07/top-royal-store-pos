import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ChevronDown, ChevronUp, Calendar, Filter } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { clsx } from 'clsx';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, any[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchTransactions(); }, [startDate, endDate, filterMethod]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let q = supabase.from('transactions')
        .select('id, tanggal, total, metode_pembayaran, diskon, catatan, users(nama), customers(nama, nomor_hp)')
        .gte('tanggal', new Date(startDate).toISOString())
        .lte('tanggal', new Date(endDate + 'T23:59:59').toISOString())
        .order('tanggal', { ascending: false });
      if (filterMethod) q = q.eq('metode_pembayaran', filterMethod);
      const { data } = await q;
      setTransactions(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (txId: string) => {
    if (expandedId === txId) { setExpandedId(null); return; }
    setExpandedId(txId);
    if (itemsMap[txId]) return;
    setLoadingItems(txId);
    const { data } = await supabase.from('transaction_items')
      .select('jumlah, harga, subtotal, products(nama_produk)')
      .eq('transaksi_id', txId);
    setItemsMap(prev => ({ ...prev, [txId]: data || [] }));
    setLoadingItems(null);
  };

  const filtered = transactions.filter(tx => {
    const nameMatch = tx.users?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customers?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || !searchTerm;
    return nameMatch;
  });

  const totalRevenue = filtered.reduce((s, tx) => s + tx.total, 0);

  const metodeColor: Record<string, string> = {
    cash: 'bg-green-100 text-green-700',
    'e-wallet': 'bg-blue-100 text-blue-700',
    transfer: 'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total {filtered.length} transaksi</p>
          <p className="text-lg font-bold text-primary-600">Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Cari kasir / pelanggan..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400 w-4 h-4 flex-shrink-0" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="flex-1 py-2 px-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400 w-4 h-4 flex-shrink-0" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="flex-1 py-2 px-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-4 h-4 flex-shrink-0" />
            <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
              className="flex-1 py-2 px-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500">
              <option value="">Semua Metode</option>
              <option value="cash">Tunai</option>
              <option value="e-wallet">E-Wallet</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Memuat riwayat transaksi...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Tidak ada transaksi pada periode ini.</div>
        ) : (
          <div className="divide-y">
            {filtered.map(tx => (
              <div key={tx.id}>
                <button onClick={() => handleExpand(tx.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', metodeColor[tx.metode_pembayaran]?.split(' ')[0] || 'bg-gray-300')} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {tx.customers?.nama ? `${tx.customers.nama}` : tx.users?.nama || 'Kasir'}
                        {tx.customers?.nama && <span className="text-xs text-gray-400 ml-1">(via {tx.users?.nama})</span>}
                      </p>
                      <p className="text-xs text-gray-400">{format(new Date(tx.tanggal), 'EEEE, dd MMM yyyy · HH:mm', { locale: idLocale })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">Rp {tx.total.toLocaleString('id-ID')}</p>
                      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full uppercase', metodeColor[tx.metode_pembayaran] || 'bg-gray-100 text-gray-600')}>
                        {tx.metode_pembayaran}
                      </span>
                    </div>
                    {expandedId === tx.id ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {expandedId === tx.id && (
                  <div className="px-5 pb-4 bg-gray-50 border-t">
                    {loadingItems === tx.id ? (
                      <p className="text-xs text-gray-400 py-3 text-center">Memuat detail...</p>
                    ) : (
                      <>
                        <div className="mt-3 space-y-1.5">
                          {(itemsMap[tx.id] || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.products?.nama_produk} <span className="text-gray-400">× {item.jumlah}</span></span>
                              <span className="font-medium text-gray-800">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between">
                          {tx.diskon > 0 && (
                            <span className="text-xs text-green-600">Diskon: -Rp {tx.diskon.toLocaleString('id-ID')}</span>
                          )}
                          <div className="ml-auto text-sm font-bold text-primary-700">Total: Rp {tx.total.toLocaleString('id-ID')}</div>
                        </div>
                        {tx.catatan && <p className="mt-1.5 text-xs text-gray-400 italic">Catatan: {tx.catatan}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
