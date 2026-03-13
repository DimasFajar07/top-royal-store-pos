import { useState, useEffect } from 'react';
import { useProductStore, Product } from '../store/products';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import { Plus, Search, Edit2, Trash2, AlertTriangle, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';


export default function Products() {
  const { products, isLoading, error, fetchProducts, addProduct, updateProduct, deleteProduct, uploadImage } = useProductStore();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Real Categories from DB
  const [categories, setCategories] = useState<{id: string, nama: string}[]>([]);

  // Stok Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustStok, setAdjustStok] = useState<number>(0);
  const [adjustAlasan, setAdjustAlasan] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama_produk: '',
    kategori_id: '',
    kategori: '', // for fallback
    harga: 0,
    stok: 0,
    barcode: '',
    gambar: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('id, nama').order('nama');
      if (data) setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = filterCategory ? p.kategori === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nama_produk: product.nama_produk,
        kategori_id: product.kategori_id || '',
        kategori: product.kategori || '',
        harga: product.harga,
        stok: product.stok,
        barcode: product.barcode || '',
        gambar: product.gambar || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        nama_produk: '',
        kategori_id: categories.length > 0 ? categories[0].id : '',
        kategori: '',
        harga: 0,
        stok: 0,
        barcode: '',
        gambar: ''
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    let imageUrl = formData.gambar;

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    const payload = {
      nama_produk: formData.nama_produk,
      kategori_id: formData.kategori_id, // must use the valid UUID
      harga_jual: formData.harga, // assuming table uses harga_jual
      stok: formData.stok,
      gambar: imageUrl,
      barcode: formData.barcode || null,
    };

    let success = false;
    if (editingProduct) {
      // @ts-ignore mapping ui fields to db schema
      success = await updateProduct(editingProduct.id, payload);
    } else {
      // @ts-ignore mapping ui fields to db schema
      success = await addProduct(payload);
    }

    setFormLoading(false);
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      await deleteProduct(id);
    }
  };

  const handleOpenAdjust = (product: Product) => {
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
      // Update stok produk
      const { error } = await supabase
        .from('products')
        .update({ stok: adjustStok })
        .eq('id', adjustingProduct.id);
      if (error) throw error;

      // Catat ke stock_logs
      await supabase.from('stock_logs').insert([{
        produk_id: adjustingProduct.id,
        perubahan: selisih,
        alasan: adjustAlasan || 'Penyesuaian stok manual',
      }]);

      setAdjustModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert('Gagal menyesuaikan stok: ' + err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Produk</h1>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Produk
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama produk atau barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.nama}>{c.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Tidak ada produk ditemukan.</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                          {product.gambar ? (
                            <img src={product.gambar} alt="" className="h-10 w-10 object-cover" />
                          ) : (
                            <div className="text-gray-400 font-bold text-xs">IMG</div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.nama_produk}</div>
                          <div className="text-sm text-gray-500">{product.barcode || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.kategori}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rp {product.harga.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        product.stok <= 5 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      )}>
                        {product.stok}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenAdjust(product)}
                          title="Sesuaikan Stok"
                          className="text-teal-600 hover:text-teal-900 mr-3"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Stok Adjustment */}
      <Modal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Sesuaikan Stok">
        {adjustingProduct && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-800">{adjustingProduct.nama_produk}</p>
              <p className="text-sm text-gray-500">
                Stok saat ini: <span className="font-semibold text-gray-800">{adjustingProduct.stok}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stok Baru</label>
              <input type="number" min={0} value={adjustStok}
                onChange={(e) => setAdjustStok(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xl font-bold focus:ring-primary-500 focus:border-primary-500" />
              <p className={`mt-1 text-sm font-medium ${adjustStok - adjustingProduct.stok > 0 ? 'text-green-600' : adjustStok - adjustingProduct.stok < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {adjustStok - adjustingProduct.stok > 0
                  ? `+${adjustStok - adjustingProduct.stok} (penambahan stok)`
                  : adjustStok - adjustingProduct.stok < 0
                  ? `${adjustStok - adjustingProduct.stok} (pengurangan stok)`
                  : 'Stok tidak berubah'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Penyesuaian</label>
              <input type="text" value={adjustAlasan}
                onChange={(e) => setAdjustAlasan(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Contoh: Barang rusak, koreksi inventaris..." />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleSaveAdjust} disabled={adjustLoading || adjustStok === adjustingProduct.stok}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
                {adjustLoading ? 'Menyimpan...' : 'Simpan Penyesuaian'}
              </button>
              <button onClick={() => setAdjustModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                Batal
              </button>
            </div>
          </div>
        )}
      </Modal>


      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Edit Produk" : "Tambah Produk"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Produk</label>
            <input
              type="text"
              required
              value={formData.nama_produk}
              onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Kategori</label>
            <select
              required
              value={formData.kategori_id}
              onChange={(e) => setFormData({ ...formData, kategori_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            >
              <option value="" disabled>Pilih Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Harga (Rp)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.harga}
                onChange={(e) => setFormData({ ...formData, harga: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stok</label>
              <input
                type="number"
                required
                min="0"
                value={formData.stok}
                onChange={(e) => setFormData({ ...formData, stok: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Barcode / SKU</label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
              placeholder="Opsional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gambar Produk</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {formData.gambar && !imageFile && (
               <div className="mt-2 text-sm text-gray-500">Gambar saat ini sudah diunggah.</div>
            )}
          </div>

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={formLoading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {formLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
