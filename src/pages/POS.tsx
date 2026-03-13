import { useState, useEffect, useRef } from 'react';
import { useProductStore } from '../store/products';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Printer, Tag, UserPlus, X, Package, Star } from 'lucide-react';
import { clsx } from 'clsx';

export default function POS() {
  const { products, fetchProducts, isLoading } = useProductStore();
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, getTotal } = useCartStore();
  const { user } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [categories, setCategories] = useState<{id: string, nama: string}[]>([]);
  
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'e-wallet' | 'transfer'>('cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  // Fitur Diskon
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'persen' | 'nominal'>('persen');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [appliedDiscount, setAppliedDiscount] = useState(0); // Nominal diskon yang diterapkan
  
  // Fitur Pelanggan
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Fitur Catatan
  const [catatan, setCatatan] = useState('');

  // Fitur Poin
  const [usePoints, setUsePoints] = useState(false);
  const POINT_RATIO = 100; // 1 Poin = Rp 100
  const EARN_RATIO = 10000; // Rp 10.000 = 1 Poin

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCustomers();
    barcodeInputRef.current?.focus();
  }, [fetchProducts]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, nama').order('nama');
    if (data) setCategories(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, nama, nomor_hp').order('nama');
    if (data) setCustomers(data);
  };

  const subtotal = getTotal();
  const maxPointsDiscount = selectedCustomer ? (selectedCustomer.poin || 0) * POINT_RATIO : 0;
  // Hitung pointDiscount jika toggle aktif. Tidak boleh melebihi (subtotal - appliedDiscount).
  const pointDiscount = (usePoints && selectedCustomer) ? Math.min(maxPointsDiscount, Math.max(0, subtotal - appliedDiscount)) : 0;
  
  const total = Math.max(0, subtotal - appliedDiscount - pointDiscount);
  const change = paymentMethod === 'cash' && typeof amountPaid === 'number' ? amountPaid - total : 0;
  const isPaidEnough = paymentMethod !== 'cash' || (typeof amountPaid === 'number' && amountPaid >= total);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = activeCategory ? p.kategori === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleBarcodeSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm) {
      const matchedProduct = products.find(p => p.barcode === searchTerm || p.nama_produk.toLowerCase() === searchTerm.toLowerCase());
      if (matchedProduct) {
        if (matchedProduct.stok > 0) {
          addToCart(matchedProduct);
          setSearchTerm('');
        } else {
          alert('Stok produk habis!');
        }
      }
    }
  };

  const handleApplyDiscount = () => {
    if (!discountValue) {
      setAppliedDiscount(0);
      setDiscountModalOpen(false);
      return;
    }
    if (discountType === 'persen') {
      const persen = Math.min(Number(discountValue), 100);
      setAppliedDiscount(Math.round(subtotal * persen / 100));
    } else {
      setAppliedDiscount(Math.min(Number(discountValue), subtotal));
    }
    setDiscountModalOpen(false);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(0);
    setDiscountValue('');
  };

  const handleCheckout = async () => {
    if (!user || items.length === 0 || !isPaidEnough) return;
    setIsProcessing(true);

    const usedPoints = usePoints ? Math.floor(pointDiscount / POINT_RATIO) : 0;
    const earnedPoints = selectedCustomer ? Math.floor(total / EARN_RATIO) : 0;
    const totalDiskon = appliedDiscount + pointDiscount;

    try {
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert([{
          total,
          metode_pembayaran: paymentMethod,
          kasir_id: user.id,
          diskon: totalDiskon,
          catatan: catatan || null,
          customer_id: selectedCustomer?.id || null,
        }])
        .select()
        .single();

      if (txError) throw txError;

      const txItems = items.map(item => ({
        transaksi_id: transaction.id,
        produk_id: item.id,
        jumlah: item.quantity,
        harga: item.harga,
        subtotal: item.harga * item.quantity
      }));

      const { error: itemsError } = await supabase.from('transaction_items').insert(txItems);
      if (itemsError) throw itemsError;

      for (const item of items) {
        const remainingStock = item.stok - item.quantity;
        await supabase.from('products').update({ stok: remainingStock }).eq('id', item.id);
      }

      // Update Poin Pelanggan
      if (selectedCustomer) {
        const currentPoints = selectedCustomer.poin || 0;
        const currentTxCount = selectedCustomer.total_transaksi || 0;
        const newPoints = currentPoints - usedPoints + earnedPoints;
        
        await supabase.from('customers')
          .update({ poin: newPoints, total_transaksi: currentTxCount + 1 })
          .eq('id', selectedCustomer.id);
      }

      fetchProducts();

      setReceiptData({
        ...transaction,
        items: [...items],
        amountPaid: paymentMethod === 'cash' ? amountPaid : total,
        change,
        diskon: totalDiskon,
        customer: selectedCustomer,
        catatan,
        earnedPoints,
        usedPoints,
      });

      setCheckoutModalOpen(false);
      clearCart();
      setAmountPaid('');
      setAppliedDiscount(0);
      setDiscountValue('');
      setPaymentMethod('cash');
      setSelectedCustomer(null);
      setCatatan('');
      setUsePoints(false);

    } catch (err: any) {
      alert('Gagal memproses transaksi: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeReceipt = () => {
    setReceiptData(null);
    barcodeInputRef.current?.focus();
  };

  const printReceipt = () => window.print();

  const filteredCustomers = customers.filter(c =>
    c.nama.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.nomor_hp && c.nomor_hp.includes(customerSearch))
  );

  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-5rem)] gap-4 pb-16 lg:pb-2 relative">
      {/* Produk Area */}
      <div className={clsx(
        "flex-1 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden min-h-0",
        activeTab !== 'products' && "hidden lg:flex"
      )}>
        {/* Search Bar */}
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Cari produk atau scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleBarcodeSubmit}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="px-4 py-3 border-b bg-gray-50 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory('')}
            className={clsx(
              'flex-shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all',
              activeCategory === '' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600'
            )}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.nama ? '' : cat.nama)}
              className={clsx(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all',
                activeCategory === cat.nama ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600'
              )}
            >
              {cat.nama}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto bg-gray-50">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-gray-500 italic">Memuat produk...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => product.stok > 0 && addToCart(product)}
                  className={clsx(
                    'bg-white border rounded-xl overflow-hidden transition-all flex flex-col active:scale-95 touch-manipulation',
                    product.stok === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer lg:hover:border-primary-400 lg:hover:shadow-md lg:hover:-translate-y-0.5'
                  )}
                >
                  <div className="h-24 sm:h-28 bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                    {product.gambar ? (
                      <img src={product.gambar} alt={product.nama_produk} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-300">
                        <Package className="w-6 h-6 sm:w-8 sm:h-8 mb-1 opacity-50" />
                        <span className="font-medium text-[8px] sm:text-[10px] uppercase tracking-wider">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                    <h3 className="font-medium text-gray-900 line-clamp-2 text-[11px] sm:text-xs leading-tight sm:leading-snug">{product.nama_produk}</h3>
                    <div className="mt-1.5 sm:mt-2 flex items-center justify-between gap-1 flex-wrap">
                      <span className="font-bold text-primary-600 text-[11px] sm:text-xs whitespace-nowrap">Rp {product.harga.toLocaleString('id-ID')}</span>
                      <span className={clsx('text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap', product.stok > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {product.stok > 0 ? `Stok: ${product.stok}` : 'Habis'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className={clsx(
        "w-full lg:w-96 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden h-full lg:h-auto min-h-0",
        activeTab !== 'cart' && "hidden lg:flex"
      )}>
        {/* Cart Header */}
        <div className="flex-shrink-0 p-4 bg-primary-600 text-white flex items-center justify-between">
          <div className="flex items-center font-semibold text-base sm:text-lg">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Keranjang
          </div>
          <div className="bg-primary-700 px-3 py-1 rounded-full text-xs font-bold">{items.length} item</div>
        </div>

        {/* Customer Selector */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b bg-gray-50 z-10">
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-700 truncate">{selectedCustomer.nama}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-primary-500 truncate">{selectedCustomer.nomor_hp || '-'}</p>
                  <p className="text-[10px] text-primary-500">• {selectedCustomer.poin || 0} Poin</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Pilih pelanggan..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-primary-400 focus:border-primary-400"
              />
              {customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-primary-50 border-b last:border-0 transition-colors">
                      <p className="font-bold text-gray-900">{c.nama}</p>
                      <p className="text-gray-500 text-[10px]">{c.nomor_hp}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0 bg-white">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 py-10">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <ShoppingCart className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">Keranjang masih kosong</p>
              <p className="text-[11px] mt-1">Pilih produk di tab Produk</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] text-gray-900 leading-tight mb-1">{item.nama_produk}</p>
                    <p className="text-xs text-primary-600 font-semibold mb-2">Rp {item.harga.toLocaleString('id-ID')}</p>
                    
                    <div className="flex items-center gap-1">
                      <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-600 active:bg-gray-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-600 active:bg-gray-100 disabled:opacity-30" 
                          disabled={item.quantity >= item.stok}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="ml-auto p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all">
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-between h-full min-w-[70px]">
                    <p className="text-[13px] font-extrabold text-gray-900">Rp {(item.harga * item.quantity).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="flex-shrink-0 p-4 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {/* Subtotal & Diskon */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs sm:text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between items-center text-xs sm:text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Diskon
                  <button onClick={handleRemoveDiscount} className="text-red-400 hover:text-red-600 ml-1 p-0.5 bg-red-50 rounded-full">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
                <span className="font-bold">- Rp {appliedDiscount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {usePoints && pointDiscount > 0 && (
              <div className="flex justify-between items-center text-xs sm:text-sm text-blue-600">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  Tukar {pointDiscount / POINT_RATIO} Poin
                  <button onClick={() => setUsePoints(false)} className="text-red-400 hover:text-red-600 ml-1 p-0.5 bg-red-50 rounded-full">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
                <span className="font-bold">- Rp {pointDiscount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-bold text-gray-800">Total</span>
              <span className="text-xl sm:text-2xl font-extrabold text-primary-700">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => { setDiscountType('persen'); setDiscountModalOpen(true); }}
              disabled={items.length === 0}
              className="flex items-center justify-center gap-2 py-3 border-2 border-primary-100 bg-white text-primary-700 rounded-xl text-xs font-bold hover:bg-primary-50 active:scale-95 transition-all disabled:opacity-40"
            >
              <Tag className="w-4 h-4" />
              Diskon
            </button>
            <button
              onClick={() => setUsePoints(!usePoints)}
              disabled={items.length === 0 || !selectedCustomer || (selectedCustomer.poin || 0) === 0}
              className={clsx(
                "flex items-center justify-center gap-2 py-3 border-2 rounded-xl text-xs font-bold transition-all active:scale-95",
                !selectedCustomer || (selectedCustomer.poin || 0) === 0 ? "opacity-40 bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed" :
                usePoints ? "bg-amber-600 text-white border-amber-600" : "bg-white border-amber-100 text-amber-600 hover:bg-amber-50"
              )}
            >
              <Star className="w-4 h-4" />
              {usePoints ? 'Batal Poin' : 'Poin'}
            </button>
          </div>
          <button
            onClick={() => setCheckoutModalOpen(true)}
            disabled={items.length === 0}
            className="w-full flex justify-between items-center py-3.5 px-5 bg-primary-600 text-white rounded-xl text-sm sm:text-base font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <span>Bayar Sekarang</span>
            <span className="bg-primary-500 px-3 py-1 rounded-lg">Rp {total.toLocaleString('id-ID')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex z-40">
        <button
          onClick={() => setActiveTab('products')}
          className={clsx(
            "flex-1 flex flex-col items-center py-2.5 transition-colors relative",
            activeTab === 'products' ? "text-primary-600" : "text-gray-400"
          )}
        >
          <div className={clsx("absolute top-0 left-0 right-0 h-1 bg-primary-600 transition-all scale-x-0 mx-8 rounded-full", activeTab === 'products' && "scale-x-100")} />
          <Package className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Produk</span>
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={clsx(
            "flex-1 flex flex-col items-center py-2.5 transition-colors relative",
            activeTab === 'cart' ? "text-primary-600" : "text-gray-400"
          )}
        >
          <div className={clsx("absolute top-0 left-0 right-0 h-1 bg-primary-600 transition-all scale-x-0 mx-8 rounded-full", activeTab === 'cart' && "scale-x-100")} />
          <div className="relative">
            <ShoppingCart className="w-5 h-5 mb-1" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                {items.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Keranjang</span>
        </button>
      </div>

      {/* Modal Diskon */}
      <Modal isOpen={discountModalOpen} onClose={() => setDiscountModalOpen(false)} title="Tambah Diskon">
        <div className="space-y-4">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setDiscountType('persen')} className={clsx('flex-1 py-2 text-sm font-medium transition-colors', discountType === 'persen' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              Persentase (%)
            </button>
            <button onClick={() => setDiscountType('nominal')} className={clsx('flex-1 py-2 text-sm font-medium transition-colors', discountType === 'nominal' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              Nominal (Rp)
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {discountType === 'persen' ? 'Persentase Diskon (0-100%)' : 'Nominal Diskon (Rp)'}
            </label>
            <input
              type="number"
              min={0}
              max={discountType === 'persen' ? 100 : subtotal}
              autoFocus
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-lg font-bold focus:ring-primary-500 focus:border-primary-500"
              placeholder={discountType === 'persen' ? '0' : '0'}
            />
            {discountValue !== '' && (
              <p className="mt-1 text-sm text-green-600 font-medium">
                Diskon: Rp {discountType === 'persen'
                  ? Math.round(subtotal * Number(discountValue) / 100).toLocaleString('id-ID')
                  : Number(discountValue).toLocaleString('id-ID')}
              </p>
            )}
          </div>
          <button onClick={handleApplyDiscount} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700">
            Terapkan Diskon
          </button>
        </div>
      </Modal>

      {/* Modal Checkout */}
      <Modal isOpen={checkoutModalOpen} onClose={() => setCheckoutModalOpen(false)} title="Pembayaran">
        <div className="space-y-4">
          <div className="bg-primary-50 p-4 rounded-xl text-center border border-primary-100">
            <p className="text-sm text-primary-600 font-semibold mb-1">Total yang harus dibayar</p>
            <p className="text-3xl font-extrabold text-primary-700">Rp {total.toLocaleString('id-ID')}</p>
            {appliedDiscount > 0 && (
              <p className="text-xs text-green-600 mt-1">Hemat Rp {appliedDiscount.toLocaleString('id-ID')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'cash', label: 'Tunai', icon: <Banknote className="w-5 h-5" /> },
                { value: 'e-wallet', label: 'E-Wallet', icon: <CreditCard className="w-5 h-5" /> },
                { value: 'transfer', label: 'Transfer', icon: <CreditCard className="w-5 h-5" /> },
              ].map(m => (
                <button key={m.value} type="button"
                  onClick={() => { setPaymentMethod(m.value as any); if (m.value !== 'cash') setAmountPaid(''); }}
                  className={clsx('flex flex-col items-center justify-center py-3 border-2 rounded-xl hover:bg-gray-50 transition-all',
                    paymentMethod === m.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
                  )}>
                  {m.icon}
                  <span className="text-xs mt-1 font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uang Diterima (Rp)</label>
                <input type="number" min={total} value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full text-xl font-bold border-gray-300 rounded-xl p-3 focus:ring-primary-500 focus:border-primary-500 border"
                  autoFocus />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[50000, 100000, 200000].map(val => (
                  <button key={val} onClick={() => setAmountPaid(val)}
                    className="py-2 border-2 border-primary-100 bg-white text-primary-700 rounded-lg text-[11px] font-bold hover:bg-primary-50 active:scale-95 transition-all">
                    Rp {(val/1000)}k
                  </button>
                ))}
              </div>
              {amountPaid !== '' && amountPaid > 0 && (
                <div className={clsx('p-4 rounded-xl flex justify-between items-center font-extrabold shadow-sm border', change >= 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100')}>
                  <span className="text-xs uppercase tracking-wider">Kembalian</span>
                  <span className="text-lg">Rp {Math.max(0, change).toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 resize-none"
              placeholder="Contoh: Nama bayi, keperluan khusus..."
            />
          </div>

          <button onClick={handleCheckout} disabled={!isPaidEnough || isProcessing}
            className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-lg font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {isProcessing ? 'Memproses...' : '✓ Selesaikan Transaksi'}
          </button>
        </div>
      </Modal>

      {/* Modal Struk */}
      <Modal isOpen={!!receiptData} onClose={closeReceipt} title="Struk Transaksi">
        {receiptData && (
          <div className="space-y-4">
            <div id="receipt-print-area" className="bg-white p-5 border border-dashed rounded-lg font-mono text-sm max-w-xs mx-auto">
              <div className="text-center mb-4">
                <h2 className="font-bold text-lg uppercase">Top Royal Shop</h2>
                <p className="text-xs text-gray-500">Jl. Contoh No. 123</p>
                <p className="text-xs text-gray-500">Telp: 0812-3456-7890</p>
              </div>
              <div className="border-b border-dashed pb-2 mb-2 text-xs space-y-1">
                <div className="flex justify-between"><span>Waktu:</span><span>{new Date(receiptData.tanggal || Date.now()).toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Kasir:</span><span>{user?.email?.split('@')[0]}</span></div>
                {receiptData.customer && <div className="flex justify-between"><span>Pelanggan:</span><span>{receiptData.customer.nama}</span></div>}
                <div className="flex justify-between"><span>Metode:</span><span className="uppercase">{receiptData.metode_pembayaran}</span></div>
              </div>
              <div className="border-b border-dashed pb-2 mb-2">
                {receiptData.items.map((item: any, idx: number) => (
                  <div key={idx} className="mb-1">
                    <div className="font-medium truncate">{item.nama_produk}</div>
                    <div className="flex justify-between text-xs">
                      <span>{item.quantity} x {item.harga.toLocaleString('id-ID')}</span>
                      <span>{(item.quantity * item.harga).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>Subtotal</span>
                  <span>Rp {(receiptData.total + (receiptData.diskon || 0)).toLocaleString('id-ID')}</span>
                </div>
                {receiptData.diskon > 0 && (
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Diskon</span>
                    <span>- Rp {receiptData.diskon.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total</span>
                  <span>Rp {receiptData.total.toLocaleString('id-ID')}</span>
                </div>
                {receiptData.metode_pembayaran === 'cash' && (
                  <>
                    <div className="flex justify-between text-xs text-gray-600"><span>Tunai</span><span>Rp {receiptData.amountPaid.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between text-xs font-medium"><span>Kembalian</span><span>Rp {receiptData.change.toLocaleString('id-ID')}</span></div>
                  </>
                )}
                {(receiptData.earnedPoints > 0 || receiptData.usedPoints > 0) && (
                  <div className="pt-2 border-t border-dashed mt-2">
                    <p className="text-center text-[10px] font-bold text-gray-500 mb-1">INFO MEMBER</p>
                    {receiptData.usedPoints > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Poin Ditukar</span>
                        <span>- {receiptData.usedPoints}</span>
                      </div>
                    )}
                    {receiptData.earnedPoints > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Poin Didapat (Belanja Min)</span>
                        <span>+ {receiptData.earnedPoints}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] font-bold text-primary-600 mt-0.5">
                      <span>Sisa Poin</span>
                      <span>{(receiptData.customer?.poin || 0) + receiptData.earnedPoints - receiptData.usedPoints}</span>
                    </div>
                  </div>
                )}
                {receiptData.catatan && <div className="text-xs text-gray-500 pt-1 border-t italic mt-2">Catatan: {receiptData.catatan}</div>}
              </div>
              <div className="text-center mt-4 text-xs text-gray-500">
                <p className="font-medium">Terima Kasih!</p>
                <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
              </div>
            </div>

            <style>{`
              @media print { 
                @page { margin: 0; size: auto; }
                body * { visibility: hidden !important; } 
                
                #receipt-print-area, #receipt-print-area * { 
                  visibility: visible !important; 
                } 
                
                #receipt-print-area { 
                  position: absolute !important; 
                  left: 0 !important; 
                  top: 0 !important; 
                  width: 100% !important; 
                  max-width: 80mm !important; /* Standar struk thermal 80mm */
                  padding: 15px !important;
                  margin: 0 !important;
                }

                /* Reset CSS agar ancestors modal tidak memotong/menghilangkan struk */
                .fixed, .absolute, .transform, .overflow-hidden, .overflow-y-auto, .flex, .min-h-screen {
                  position: static !important;
                  transform: none !important;
                  overflow: visible !important;
                  display: block !important;
                  height: auto !important;
                  min-height: 0 !important;
                }

                .no-print { display: none !important; }
              }
            `}</style>
            
            <div className="flex gap-3 mt-4 no-print">
              <button onClick={printReceipt} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700">
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button onClick={closeReceipt} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
