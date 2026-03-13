import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Plus, Edit2, Trash2, Tag, Search, AlertCircle } from 'lucide-react';
import Modal from '../components/ui/Modal';

export default function Categories() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nama: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*, products(count)').order('nama');
    if (data) setCategories(data);
    setLoading(false);
  };

  const handleOpenModal = (category: any = null) => {
    if (category) {
      setEditingId(category.id);
      setFormData({ nama: category.nama });
    } else {
      setEditingId(null);
      setFormData({ nama: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) return;
    
    setIsSaving(true);
    try {
      if (editingId) {
        await supabase.from('categories').update({ nama: formData.nama.trim() }).eq('id', editingId);
      } else {
        await supabase.from('categories').insert([{ nama: formData.nama.trim() }]);
      }
      await fetchCategories();
      setIsModalOpen(false);
    } catch (error: any) {
      alert('Gagal menyimpan kategori: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if category is used
      const category = categories.find(c => c.id === id);
      if (category?.products?.[0]?.count > 0) {
        alert('Kategori tidak bisa dihapus karena masih memiliki produk.');
        return;
      }

      await supabase.from('categories').delete().eq('id', id);
      setDeleteConfirm(null);
      await fetchCategories();
    } catch (error: any) {
      alert('Gagal menghapus: ' + error.message);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500 max-w-sm">Anda tidak memiliki izin untuk mengelola kategori. Fitur ini khusus untuk Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kategori Produk</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Kategori
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari kategori..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Nama Kategori</th>
                  <th className="px-6 py-4">Jumlah Produk</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-800">
                {filteredCategories.length > 0 ? filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary-500" />
                        <span className="font-medium">{category.nama}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {category.products?.[0]?.count || 0} produk
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirm === category.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium mr-2">Hapus kategori ini?</span>
                          <button onClick={() => handleDelete(category.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Ya</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">Batal</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(category)}
                            className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(category.id)}
                            className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500">Tidak ada kategori ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal CRUD Kategori */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSaving && setIsModalOpen(false)} 
        title={editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
            <input 
              type="text" 
              required
              autoFocus
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Contoh: Pakaian Anak" 
            />
          </div>
          
          <div className="pt-2 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={isSaving || !formData.nama.trim()}
              className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
