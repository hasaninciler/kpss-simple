'use client';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/store/auth';
import Link from 'next/link';

function Pomodoro() {
  const MODES = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const [mode, setMode] = useState<'work' | 'short' | 'long'>('work');
  const [time, setTime] = useState(MODES.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTime(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'work') setSessions(s => s + 1);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m: 'work' | 'short' | 'long') => {
    setMode(m); setTime(MODES[m]); setRunning(false);
  };

  const mm = String(Math.floor(time / 60)).padStart(2, '0');
  const ss = String(time % 60).padStart(2, '0');
  const pct = ((MODES[mode] - time) / MODES[mode]) * 100;
  const colors = { work: '#4F46E5', short: '#22C55E', long: '#F59E0B' };
  const labels = { work: 'Çalışma', short: 'Kısa Mola', long: 'Uzun Mola' };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-semibold">🍅 Pomodoro</div>
        <div className="text-xs text-slate-500">{sessions} seans</div>
      </div>
      <div className="flex gap-1 mb-4 bg-[#0F172A] p-1 rounded-lg">
        {(Object.keys(MODES) as Array<'work'|'short'|'long'>).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-all ${mode === m ? 'bg-[#253347] text-white' : 'text-slate-500 hover:text-white'}`}>
            {labels[m]}
          </button>
        ))}
      </div>
      <div className="flex justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1E293B" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none" stroke={colors[mode]} strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-black font-mono">{mm}:{ss}</div>
            <div className="text-[9px] text-slate-500">{labels[mode]}</div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(r => !r)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${running ? 'bg-warning/20 text-warning' : 'bg-primary hover:bg-primary-light text-white'}`}>
          {running ? '⏸ Durdur' : '▶ Başlat'}
        </button>
        <button onClick={() => { setTime(MODES[mode]); setRunning(false); }}
          className="px-3 py-2 rounded-lg bg-[#253347] text-slate-400 hover:text-white text-sm transition-colors">↺</button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { api.get('/stats').then(r => setStats(r.data)); }, []);

  const daysLeft = Math.ceil((new Date('2026-07-06').getTime() - Date.now()) / 86400000);
  const level = Math.floor((user?.xp || 0) / 500) + 1;
  const levelXp = (user?.xp || 0) % 500;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Merhaba, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-400 mt-0.5">Bugün de harika olacak!</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <span className="text-lg">🔥</span>
          <div>
            <div className="text-sm font-bold text-orange-400">{user?.streak || 0} gün</div>
            <div className="text-[10px] text-slate-500">seri</div>
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">KPSS 2026 Geri Sayım</div>
          <div className="text-2xl font-black text-primary-light">{daysLeft} gün</div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${Math.min(100, ((365 - daysLeft) / 365) * 100)}%` }} />
        </div>
        <div className="text-[10px] text-slate-500 mt-1">6 Temmuz 2026</div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'XP', value: user?.xp || 0, icon: '⭐', color: 'text-warning' },
              { label: 'Deneme', value: stats?.totalAttempts || 0, icon: '📝', color: 'text-primary-light' },
              { label: 'Ort. Net', value: stats?.avgNet || 0, icon: '🎯', color: 'text-success' },
              { label: 'Flashcard', value: stats?.totalFlashcards || 0, icon: '🃏', color: 'text-secondary' },
            ].map(s => (
              <div key={s.label} className="card p-4 relative overflow-hidden">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{s.label}</div>
                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                <div className="absolute right-3 bottom-2 text-xl opacity-10">{s.icon}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-semibold">Son Denemeler</div>
              <Link href="/quiz" className="text-xs text-primary-light hover:text-white transition-colors">Yeni →</Link>
            </div>
            {stats?.recentAttempts?.length ? (
              <div className="space-y-2">
                {stats.recentAttempts.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0">
                    <div className="text-xs text-slate-500 w-16 flex-shrink-0">
                      {new Date(a.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (a.correct / Math.max(1, a.correct + a.wrong + a.empty)) * 100)}%` }} />
                    </div>
                    <div className="flex gap-2 text-xs flex-shrink-0">
                      <span className="text-success">✅{a.correct}</span>
                      <span className="text-red-400">❌{a.wrong}</span>
                      <span className="font-bold text-primary-light">Net:{a.net_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-600 text-sm">
                Henüz deneme yok. <Link href="/quiz" className="text-primary-light">Başla →</Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/video', emoji: '🎬', title: 'Video İzle', sub: 'Coğrafya, Tarih, Matematik...' },
              { href: '/pdf', emoji: '📄', title: 'PDF Yükle', sub: 'AI ile soru üret' },
              { href: '/ai-tutor', emoji: '🤖', title: 'AI Öğretmen', sub: 'DeepSeek ile çalış' },
              { href: '/flashcard', emoji: '🃏', title: 'Flashcard', sub: `${stats?.totalFlashcards || 0} kart var` },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="card flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="text-2xl">{item.emoji}</div>
                <div>
                  <div className="text-sm font-medium group-hover:text-primary-light transition-colors">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Pomodoro />
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-semibold">Seviye {level}</div>
              <div className="text-xs text-primary-light font-bold">Lv.{level}</div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                style={{ width: `${(levelXp / 500) * 100}%` }} />
            </div>
            <div className="text-[10px] text-slate-500">{levelXp} / 500 XP</div>
          </div>
          <div className="card bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="text-lg mb-1">💪</div>
            <div className="text-xs text-success font-medium mb-1">Motivasyon</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              "Başarı, her gün küçük çabalar tekrarlandığında ortaya çıkar."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
