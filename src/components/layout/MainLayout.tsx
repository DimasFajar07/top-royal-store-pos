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
  Tag
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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: true },
    { name: 'POS Kasir', href: '/pos', icon: ShoppingCart, adminOnly: false },
    { name: 'Shift Kasir', href: '/shift', icon: Clock, adminOnly: false },
    { name: 'Produk', href: '/products', icon: Package, adminOnly: false },
    { name: 'Kategori', href: '/categories', icon: Tag, adminOnly: true },
    { name: 'Stok Barang', href: '/stock', icon: Boxes, adminOnly: false },
    { name: 'Pelanggan', href: '/customers', icon: UserCircle, adminOnly: false },
    { name: 'Riwayat Transaksi', href: '/history', icon: History, adminOnly: false },
    { name: 'Laporan', href: '/reports', icon: FileText, adminOnly: false },
    { name: 'Pengguna', href: '/users', icon: Users, adminOnly: true },
    { name: 'Pengaturan', href: '/settings', icon: Settings, adminOnly: false },
  ];

  const filteredNav = navigation.filter(item => {
    if (item.adminOnly && profile?.role !== 'admin') return false;
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-gray-950 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="bg-teal-500 rounded-lg p-1.5">
            <Store className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-base font-bold tracking-tight">Top Royal Shop</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">Menu Utama</p>
        {filteredNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-700/60 hover:text-white'
              )}
            >
              <item.icon className={clsx('mr-3 flex-shrink-0 h-5 w-5 transition-colors', isActive ? 'text-white' : 'text-gray-400 group-hover:text-white')} />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="h-4 w-4 text-teal-300" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-gray-700/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gray-700/40 mb-2">
          <div className="bg-teal-600 text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {profile?.nama?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{profile?.nama || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{profile?.role || 'kasir'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] bg-gray-100 font-sans overflow-x-hidden">
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 bg-gray-800 rounded-full"
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
        <div className="flex w-60 flex-col bg-gray-900 shadow-xl border-r border-gray-800">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="text-gray-500 hover:text-gray-900 p-1"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-teal-500 rounded-md p-1">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-800 text-sm">Top Royal Shop</span>
            </div>
          </div>
          <div className="bg-teal-600 text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs">
            {profile?.nama?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        <main className="flex-1 relative focus:outline-none bg-gray-100 p-3 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
