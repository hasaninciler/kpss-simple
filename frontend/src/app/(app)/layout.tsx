'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import Sidebar from '@/components/Sidebar';
import PomodoroWidget from '@/components/PomodoroWidget';
import { Toaster } from 'react-hot-toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { fetchMe } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    fetchMe();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Üst bar — masaüstünde sağda Pomodoro */}
        <div className="hidden md:flex items-center justify-end px-6 py-2.5 border-b border-white/[0.08] bg-[#1E293B] flex-shrink-0">
          <PomodoroWidget />
        </div>
        {/* Mobil: sabit üst barın içinde (hamburgerin solunda) */}
        <div className="md:hidden fixed top-2.5 right-14 z-50">
          <PomodoroWidget />
        </div>
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' },
        success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
        error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
      }} />
    </div>
  );
}
