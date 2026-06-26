'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/store/auth';
import Link from 'next/link';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { api.get('/stats').then(r => setStats(r.data)); }, []);

  const examDate = new Date('2026-07-06');
  const daysLeft = Math.ceil((examDate.getTime() - Date.now()) / 86400000);

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Hoş Geldin, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-400 mt-0.5">KPSS'ye <span className="text-warning font-semibold">{daysLeft} gün</span> kaldı</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <span>🔥</span>
          <span className="text-sm font-bold text-orange-400">{user?.streak || 0} günlük seri</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam XP', value: user?.xp || 0, icon: '⭐', color: 'text-warning' },
          { label: 'Deneme Sayısı', value: stats?.totalAttempts || 0, icon: '📝', color: 'text-primary-light' },
          { label: 'Ortalama Net', value: stats?.avgNet || 0, icon: '🎯', color: 'text-success' },
          { label: 'Flashcard', value: stats?.totalFlashcards || 0, icon: '🃏', color: 'text-secondary' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl opacity-10">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Son denemeler */}
      {stats?.recentAttempts?.length > 0 && (
        <div className="card">
          <div className="text-sm font-semibold mb-4">Son Denemeler</div>
          <div className="space-y-2">
            {stats.recentAttempts.slice(0, 5).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.06] last:border-0">
                <div className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString('tr-TR')}</div>
                <div className="flex gap-3 ml-auto text-xs">
                  <span className="text-success">✅ {a.correct}</span>
                  <span className="text-red-400">❌ {a.wrong}</span>
                  <span className="font-bold text-primary-light">Net: {a.net_score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hızlı başla */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Hızlı Başla</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/pdf', emoji: '📄', title: 'PDF Yükle', sub: 'AI ile soru üret' },
            { href: '/ai-tutor', emoji: '🤖', title: 'AI Öğretmen', sub: 'Konu sor, anlat' },
            { href: '/quiz', emoji: '📝', title: 'Quiz Çöz', sub: 'Sorularını test et' },
            { href: '/flashcard', emoji: '🃏', title: 'Flashcard', sub: 'Tekrar yap' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="card hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-3 group">
              <div className="text-2xl">{item.emoji}</div>
              <div>
                <div className="text-sm font-medium group-hover:text-primary-light transition-colors">{item.title}</div>
                <div className="text-xs text-slate-500">{item.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
