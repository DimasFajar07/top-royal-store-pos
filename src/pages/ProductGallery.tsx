import { useState, useEffect } from 'react';
import { useProductStore } from '../store/products';
import { supabase } from '../lib/supabase';
import { Images, Trash2, Camera, RefreshCw, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function ProductGallery() {
  const { products, isLoading, fetchProducts, updateProduct, uploadImage } = useProductStore();
  const [categories, setCategories] = useState<{ id: string; nama: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, nama').order('nama');
    if (data) setCategories(data);
  };

  const filteredProducts = activeCategory
    ? products.filter((p) => p.kategori === activeCategory)
    : products;

  const countByCategory = (catName: string) =>
    products.filter((p) => p.kategori === catName).length;

  // Per-produk file input handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, productId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(productId);
    try {
      const uploadedUrl = await uploadImage(file);
      await updateProduct(productId, { gambar: uploadedUrl });
      await fetchProducts();
      setSuccessId(productId);
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err: any) {
      alert('⚠️ Gagal upload foto:\n\n' + err.message);
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (productId: string) => {
    if (!window.confirm('Hapus foto produk ini? Produk akan kembali menggunakan gambar dummy.')) return;
    setUploadingId(productId);
    try {
      await updateProduct(productId, { gambar: null });
      await fetchProducts();
    } catch (err: any) {
      alert('Gagal hapus foto: ' + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Images className="w-5 h-5 text-teal-600" />
            Galeri Foto Produk
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {products.length} produk · Hover kartu untuk mengedit atau menghapus foto
          </p>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Category Filter Tab */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center overflow-x-auto scrollbar-hide px-3 py-2 gap-1.5 border-b border-slate-100">
          <button
            onClick={() => setActiveCategory('')}
            className={clsx(
              'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all',
              activeCategory === ''
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.nama ? '' : cat.nama)}
              className={clsx(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
                activeCategory === cat.nama
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              )}
            >
              {cat.nama} ({countByCategory(cat.nama)})
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent mr-3" />
              Memuat produk...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Images className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada produk</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => {
                const imgSrc =
                  product.gambar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    product.nama_produk
                  )}&background=random&color=fff&size=400&bold=true`;

                const isUploading = uploadingId === product.id;
                const isSuccess = successId === product.id;

                return (
                  <div
                    key={product.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative"
                  >
                    {/* Image Area */}
                    <div className="relative w-full aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={imgSrc}
                        alt={product.nama_produk}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            product.nama_produk
                          )}&background=64748b&color=fff&size=400&bold=true`;
                        }}
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        {/* Upload Foto Button */}
                        <label
                          htmlFor={`file-${product.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition shadow cursor-pointer"
                          title="Ganti / Upload Foto"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {product.gambar ? 'Ganti Foto' : 'Upload Foto'}
                        </label>
                        {/* Hapus Foto */}
                        <button
                          onClick={() => handleDeleteImage(product.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-red-500 hover:bg-red-50 transition shadow"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Foto
                        </button>
                      </div>

                      {/* File Input (satu per produk, tersembunyi) */}
                      <input
                        id={`file-${product.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, product.id)}
                      />

                      {/* Badge Dummy */}
                      {!product.gambar && (
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Dummy
                        </div>
                      )}

                      {/* Uploading Overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent" />
                          <p className="text-xs text-teal-700 font-semibold">Uploading...</p>
                        </div>
                      )}

                      {/* Success Overlay */}
                      {isSuccess && (
                        <div className="absolute inset-0 bg-teal-600/80 flex flex-col items-center justify-center gap-1">
                          <CheckCircle className="w-10 h-10 text-white" />
                          <p className="text-xs text-white font-bold">Tersimpan!</p>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p
                        className="text-[12px] font-semibold text-slate-800 line-clamp-2 leading-snug"
                        title={product.nama_produk}
                      >
                        {product.nama_produk}
                      </p>
                      <p className="text-teal-600 font-bold text-sm mt-1">
                        Rp {product.harga.toLocaleString('id-ID')}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5 truncate">{product.kategori}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
