'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Giriş başarısız');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.08)' } }} />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl mx-auto mb-3">🎯</div>
          <h1 className="text-2xl font-black">KPSS Master AI</h1>
          <p className="text-slate-400 text-sm mt-1">Yapay Zeka Destekli Hazırlık</p>
        </div>
        <div className="card">
          <h2 className="text-base font-bold mb-5">Giriş Yap</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="demo@kpss.com" required className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Şifre</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-white/[0.08] text-center text-xs text-slate-500">
            Hesabın yok mu?{' '}
            <Link href="/register" className="text-primary-light hover:text-white transition-colors">Kayıt Ol</Link>
          </div>
          <div className="mt-3 p-2.5 rounded-lg bg-primary/10 text-center text-xs text-slate-400">
            Demo: <strong className="text-primary-light">demo@kpss.com</strong> / <strong className="text-primary-light">Demo2026!</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
