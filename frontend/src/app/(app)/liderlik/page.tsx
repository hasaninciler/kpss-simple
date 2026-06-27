'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Trophy, Medal, Award } from 'lucide-react';

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [badges, setBadges] = useState<any>(null);
  const [tab, setTab] = useState<'rank'|'badges'>('rank');

  useEffect(() => {
    api.get('/social/leaderboard').then(r => setData(r.data));
    api.get('/social/badges').then(r => setBadges(r.data));
  }, []);

  const rankIcon = (i: number) => {
    if (i === 0) return <span className="text-xl">🥇</span>;
    if (i === 1) return <span className="text-xl">🥈</span>;
    if (i === 2) return <span className="text-xl">🥉</span>;
    return <span className="text-sm font-bold text-slate-500 w-6 text-center">{i + 1}</span>;
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-lg md:text-xl font-bold mb-1">🏆 Liderlik & Başarılar</h1>
      <p className="text-xs text-slate-500 mb-4">Arkadaşlarınla yarış, rozet topla</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0F172A] p-1 rounded-xl">
        <button onClick={() => setTab('rank')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab==='rank'?'bg-[#1E293B] text-white':'text-slate-500'}`}>
          🏆 Sıralama
        </button>
        <button onClick={() => setTab('badges')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab==='badges'?'bg-[#1E293B] text-white':'text-slate-500'}`}>
          🎖️ Rozetler {badges && `(${badges.earnedCount}/${badges.total})`}
        </button>
      </div>

      {/* Sıralama */}
      {tab === 'rank' && (
        <div className="space-y-2">
          {data?.leaderboard?.map((u: any, i: number) => {
            const isMe = u.id === data.myId;
            const level = Math.floor(u.xp / 500) + 1;
            return (
              <div key={u.id} className={`card flex items-center gap-3 ${isMe ? 'border-primary/40 bg-primary/5' : ''} ${i < 3 ? 'border-warning/20' : ''}`}>
                <div className="w-8 flex justify-center flex-shrink-0">{rankIcon(i)}</div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {u.name.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {u.name} {isMe && <span className="badge-blue text-[9px]">SEN</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">Lv.{level} · {u.quizzes} deneme · 🔥{u.streak}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black text-warning">{u.xp}</div>
                  <div className="text-[10px] text-slate-500">XP</div>
                </div>
              </div>
            );
          })}
          {(!data?.leaderboard || data.leaderboard.length === 0) && (
            <div className="text-center py-12 text-slate-600 text-sm">Henüz sıralama yok</div>
          )}
        </div>
      )}

      {/* Rozetler */}
      {tab === 'badges' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {badges?.badges?.map((b: any) => (
            <div key={b.type} className={`card text-center transition-all ${b.earned ? '' : 'opacity-40 grayscale'}`}>
              <div className="text-3xl mb-2">{b.icon}</div>
              <div className="text-sm font-semibold mb-0.5">{b.title}</div>
              <div className="text-[11px] text-slate-500">{b.desc}</div>
              {b.earned && <div className="mt-2 text-[10px] text-success">✓ Kazanıldı</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
