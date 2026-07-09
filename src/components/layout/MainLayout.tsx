import { useEffect } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { 
  Store, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Users, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCircle,
  Clock,
  Settings,
  History,
  Boxes,
  Tag,
  ImagePlus,
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export default function MainLayout() {
  const { user, profile, isLoading, checkSession, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent"></div>
          <p className="text-sm text-gray-500 font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
    { name: 'Kasir', href: '/pos', icon: ShoppingCart, adminOnly: false },
    { name: 'Shift Kasir', href: '/shift', icon: Clock, adminOnly: false },
    { name: 'Produk', href: '/products', icon: Package, adminOnly: false },
    { name: 'Foto Produk', href: '/gallery', icon: ImagePlus, adminOnly: false },
    { name: 'Kategori', href: '/categories', icon: Tag, adminOnly: false },
    { name: 'Stok Barang', href: '/stock', icon: Boxes, adminOnly: false },
    { name: 'Pelanggan', href: '/customers', icon: UserCircle, adminOnly: false },
    { name: 'Riwayat Transaksi', href: '/history', icon: History, adminOnly: false },
    { name: 'Laporan', href: '/reports', icon: FileText, adminOnly: true },
    { name: 'Pengguna', href: '/users', icon: Users, adminOnly: true },
    { name: 'Pengaturan', href: '/settings', icon: Settings, adminOnly: true },
  ];

  const filteredNav = navigation.filter(item => {
    if (item.adminOnly && profile?.role !== 'admin') return false;
    return true;
  });

  // Proteksi Route Berbasis Role (Jika bukan admin mencoba membuka halaman admin)
  if (profile && profile.role !== 'admin') {
    const currentNavItem = navigation.find(item => location.pathname.startsWith(item.href));
    if (currentNavItem?.adminOnly) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-slate-950/50 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl p-2 shadow-lg shadow-primary-500/30">
            <Store className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">Top Royale Store</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="px-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Menu Utama</p>
        {filteredNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'group flex items-center px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
              )}
            >
              <item.icon className={clsx('mr-3 flex-shrink-0 h-5 w-5 transition-colors', isActive ? 'text-white' : 'text-slate-500 group-hover:text-primary-400')} />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="h-4 w-4 text-primary-200" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-950/30">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/5 mb-3 shadow-inner">
          <div className="bg-gradient-to-br from-primary-400 to-primary-600 text-white h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md">
            {profile?.nama?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{profile?.nama || 'User'}</p>
            <p className="text-xs text-primary-400 font-medium capitalize">{profile?.role || 'kasir'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all duration-300"
        >
          <LogOut className="h-4 w-4" />
          Keluar Sistem
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-gray-900 shadow-2xl z-50">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white p-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex w-64 flex-col shadow-2xl z-20">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 relative">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 px-4 py-3 shadow-sm sticky top-0 z-30">
          <button
            className="text-slate-500 hover:text-primary-600 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary-400 to-primary-600 rounded-md p-1.5 shadow-sm">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-800 text-sm tracking-tight">Top Royale</span>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
