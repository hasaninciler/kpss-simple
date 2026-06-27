'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { register, loading } = useAuth();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Şifre en az 8 karakter olmalı'); return; }
    try {
      await register(form.name, form.email, form.password);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Kayıt başarısız');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.08)' } }} />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl mx-auto mb-3">🎯</div>
          <h1 className="text-2xl font-black">KPSS Master AI</h1>
        </div>
        <div className="card">
          <h2 className="text-base font-bold mb-5">Kayıt Ol</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Ad Soyad</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Ayşe Yılmaz" required className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="ornek@email.com" required className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Şifre</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="En az 8 karakter" required className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol →'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-white/[0.08] text-center text-xs text-slate-500">
            Hesabın var mı?{' '}
            <Link href="/login" className="text-primary-light hover:text-white transition-colors">Giriş Yap</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
