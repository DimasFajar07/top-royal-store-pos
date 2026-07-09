import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, Lock, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

type Mode = 'login' | 'forgot';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('login');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal login. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Masukkan email Anda.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim email reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Premium vibrant blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center space-x-3 text-primary-600 mb-6 animate-bounce-slow">
          <div className="p-3 bg-white rounded-2xl shadow-xl shadow-primary-500/20">
            <Store className="w-10 h-10" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">
          Top Royale Store
        </h2>
        <p className="mt-3 text-center text-sm text-slate-500 font-medium tracking-wide uppercase">
          {mode === 'login' ? 'Masuk untuk mengelola toko' : 'Reset Password Akun Anda'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-8 px-4 sm:rounded-3xl sm:px-10">

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm mb-4" role="alert">
              <p className="font-bold">Perhatian</p>
              <p>{error}</p>
            </div>
          )}

          {mode === 'forgot' ? (
            resetSent ? (
              <div className="flex flex-col items-center text-center gap-4 py-6">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <h3 className="text-lg font-bold text-gray-800">Email Terkirim!</h3>
                <p className="text-sm text-gray-500">
                  Link reset password telah dikirimkan ke <strong>{email}</strong>. Silakan cek kotak masuk atau folder Spam Anda.
                </p>
                <button
                  onClick={() => { setMode('login'); setResetSent(false); setEmail(''); setError(''); }}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold mt-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Login
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleForgotPassword}>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 font-medium mb-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Login
                </button>
                <p className="text-sm text-gray-500">
                  Masukkan email yang terdaftar. Kami akan mengirimkan tautan untuk membuat password baru.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <div className="mt-1 relative rounded-lg shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-200 rounded-lg py-3 px-4 bg-gray-50 focus:bg-white transition-all"
                      placeholder="email@topstores.com"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirim Link Reset Password'}
                </button>
              </form>
            )
          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="mt-1 relative rounded-xl shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 block w-full pl-11 sm:text-sm border-slate-200 rounded-xl py-3 px-4 bg-white/50 focus:bg-white transition-all duration-200"
                    placeholder="admin@babyshop.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="mt-1 relative rounded-xl shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 block w-full pl-11 sm:text-sm border-slate-200 rounded-xl py-3 px-4 bg-white/50 focus:bg-white transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me" name="remember-me" type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Ingat saya</label>
                </div>
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Lupa password?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/30 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transform transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log in Sistem'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-200/50 text-center">
            <p className="text-sm text-slate-500">
              Belum punya akun?{' '}
              <Link to="/register" className="font-bold text-primary-600 hover:text-primary-500 transition-colors">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
