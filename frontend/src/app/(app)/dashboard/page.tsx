'use client';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/store/auth';
import Link from 'next/link';

function Pomodoro() {
  const MODES = { work: 25*60, short: 5*60, long: 15*60 };
  const [mode, setMode] = useState<'work'|'short'|'long'>('work');
  const [time, setTime] = useState(MODES.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const ref = useRef<any>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setTime(t => {
          if (t <= 1) { clearInterval(ref.current); setRunning(false); if (mode==='work') { setSessions(s=>s+1); api.post('/social/study-log',{minutes:25}).catch(()=>{}); } return 0; }
          return t - 1;
        });
      }, 1000);
    } else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running, mode]);

  const mm = String(Math.floor(time/60)).padStart(2,'0');
  const ss = String(time%60).padStart(2,'0');
  const pct = ((MODES[mode]-time)/MODES[mode])*100;
  const colors = { work:'#4F46E5', short:'#22C55E', long:'#F59E0B' };
  const labels = { work:'Çalışma', short:'Kısa Mola', long:'Uzun Mola' };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-semibold">🍅 Pomodoro</div>
        <div className="text-xs text-slate-500">{sessions} seans</div>
      </div>
      <div className="flex gap-1 mb-4 bg-[#0F172A] p-1 rounded-lg">
        {(Object.keys(MODES) as Array<'work'|'short'|'long'>).map(m=>(
          <button key={m} onClick={()=>{setMode(m);setTime(MODES[m]);setRunning(false);}} className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-all ${mode===m?'bg-[#253347] text-white':'text-slate-500'}`}>{labels[m]}</button>
        ))}
      </div>
      <div className="flex justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1E293B" strokeWidth="8"/>
            <circle cx="50" cy="50" r="44" fill="none" stroke={colors[mode]} strokeWidth="8" strokeDasharray={`${2*Math.PI*44}`} strokeDashoffset={`${2*Math.PI*44*(1-pct/100)}`} strokeLinecap="round" style={{transition:'stroke-dashoffset 1s linear'}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-black font-mono">{mm}:{ss}</div>
            <div className="text-[9px] text-slate-500">{labels[mode]}</div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>setRunning(r=>!r)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${running?'bg-warning/20 text-warning':'bg-primary hover:bg-primary-light text-white'}`}>{running?'⏸ Durdur':'▶ Başlat'}</button>
        <button onClick={()=>{setTime(MODES[mode]);setRunning(false);}} className="px-3 py-2 rounded-lg bg-[#253347] text-slate-400 hover:text-white text-sm">↺</button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [badges, setBadges] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [todayPlan, setTodayPlan] = useState<any[]>([]);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data));
    api.get('/social/weekly-study').then(r => setWeekly(r.data)).catch(()=>{});
    api.get('/social/badges').then(r => setBadges(r.data)).catch(()=>{});
    api.get('/study/daily').then(r => setDaily(r.data)).catch(()=>{});
    api.get('/planner').then(r => setTodayPlan(r.data)).catch(()=>{});
  }, []);

  const daysLeft = Math.ceil((new Date('2026-07-06').getTime() - Date.now()) / 86400000);
  const level = Math.floor((user?.xp || 0) / 500) + 1;
  const levelXp = (user?.xp || 0) % 500;
  const maxMin = Math.max(...weekly.map(w => w.minutes), 60);
  const dayNames = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Merhaba, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-xs text-slate-400 mt-0.5">Bugün de harika olacak!</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <span className="text-lg">🔥</span>
          <div><div className="text-sm font-bold text-orange-400">{user?.streak || 0} gün</div><div className="text-[10px] text-slate-500">seri</div></div>
        </div>
      </div>

      {/* KPSS Countdown */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">KPSS 2026 Geri Sayım</div>
          <div className="text-xl md:text-2xl font-black text-primary-light">{daysLeft} gün</div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{width:`${Math.min(100,((365-daysLeft)/365)*100)}%`}}/>
        </div>
      </div>

      {/* Günlük Görev */}
      {daily && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">🎯 Bugünkü Hedef</div>
            <span className="text-xs text-slate-500">{daily.questionsSolved}/{daily.goal} soru</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Soru Çöz', current: daily.questionsSolved, goal: daily.goal, icon: '✍️', color: '#4F46E5', href: '/quiz' },
              { label: 'Video İzle', current: daily.videosWatched, goal: 3, icon: '🎬', color: '#22C55E', href: '/video' },
              { label: 'Flashcard', current: daily.flashcardsDone, goal: 10, icon: '🃏', color: '#F59E0B', href: '/flashcard' },
            ].map(t => {
              const pct = Math.min(100, (t.current / t.goal) * 100);
              const done = t.current >= t.goal;
              return (
                <Link key={t.label} href={t.href} className="bg-[#0F172A] rounded-xl p-3 hover:bg-[#253347] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{t.icon}</span>
                    {done && <span className="text-success text-xs">✓</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 mb-1">{t.label}</div>
                  <div className="text-sm font-bold mb-1.5" style={{ color: done ? '#22C55E' : t.color }}>{t.current}/{t.goal}</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? '#22C55E' : t.color }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'XP', value:user?.xp||0, icon:'⭐', color:'text-warning' },
          { label:'Deneme', value:stats?.totalAttempts||0, icon:'📝', color:'text-primary-light' },
          { label:'Ort. Net', value:stats?.avgNet||0, icon:'🎯', color:'text-success' },
          { label:'Flashcard', value:stats?.totalFlashcards||0, icon:'🃏', color:'text-secondary' },
        ].map(s => (
          <div key={s.label} className="card p-3 md:p-4 relative overflow-hidden">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{s.label}</div>
            <div className={`text-lg md:text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="absolute right-3 bottom-2 text-xl opacity-10">{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 space-y-4">
          {/* Haftalık çalışma grafiği */}
          <div className="card">
            <div className="text-sm font-semibold mb-4">📊 Bu Hafta Çalışma</div>
            <div className="flex items-end justify-between gap-2 h-28">
              {weekly.length > 0 ? weekly.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-[#0F172A] rounded-md relative" style={{height:'80px'}}>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary-light rounded-md transition-all" style={{height:`${(d.minutes/maxMin)*100}%`,minHeight:d.minutes>0?'4px':'0'}}/>
                  </div>
                  <div className="text-[9px] text-slate-500">{dayNames[i]}</div>
                  <div className="text-[9px] text-slate-400 font-medium">{d.minutes}dk</div>
                </div>
              )) : (
                <div className="w-full text-center text-slate-600 text-xs py-8">Henüz çalışma kaydı yok</div>
              )}
            </div>
          </div>

          {/* Son denemeler */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-semibold">Son Denemeler</div>
              <Link href="/quiz" className="text-xs text-primary-light hover:text-white transition-colors">Yeni →</Link>
            </div>
            {stats?.recentAttempts?.length ? (
              <div className="space-y-2">
                {stats.recentAttempts.slice(0,5).map((a:any,i:number)=>(
                  <div key={i} className="flex items-center gap-2 md:gap-3 py-2 border-b border-white/[0.05] last:border-0">
                    <div className="text-[11px] text-slate-500 w-14 flex-shrink-0">{new Date(a.created_at).toLocaleDateString('tr-TR',{month:'short',day:'numeric'})}</div>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${Math.min(100,(a.correct/Math.max(1,a.correct+a.wrong+a.empty))*100)}%`}}/></div>
                    <div className="flex gap-1.5 text-[11px] flex-shrink-0"><span className="text-success">✅{a.correct}</span><span className="text-red-400">❌{a.wrong}</span><span className="font-bold text-primary-light">N:{a.net_score}</span></div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-6 text-slate-600 text-sm">Henüz deneme yok. <Link href="/quiz" className="text-primary-light">Başla →</Link></div>}
          </div>

          {/* Hızlı erişim */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { href:'/video', emoji:'🎬', title:'Video İzle', sub:'AI ile çalış' },
              { href:'/pdf', emoji:'⚡', title:'Soru Üret', sub:'Konu yaz, üret' },
              { href:'/ai-tutor', emoji:'🤖', title:'AI Öğretmen', sub:'Konu sor' },
              { href:'/liderlik', emoji:'🏆', title:'Liderlik', sub:'Sıralamana bak' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="card flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="text-2xl">{item.emoji}</div>
                <div><div className="text-sm font-medium group-hover:text-primary-light transition-colors">{item.title}</div><div className="text-xs text-slate-500">{item.sub}</div></div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Bugünün Planı */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-semibold">📅 Bugünün Planı</div>
              <Link href="/plan" className="text-xs text-primary-light hover:text-white transition-colors">Tümü →</Link>
            </div>
            {todayPlan.length > 0 ? (
              <div className="space-y-1.5">
                {todayPlan.slice(0, 4).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${t.done ? 'border-success bg-success' : 'border-slate-600'}`}>
                      {t.done && <span className="text-white text-[8px]">✓</span>}
                    </div>
                    <span className={`flex-1 truncate ${t.done ? 'line-through text-slate-600' : 'text-slate-300'}`}>{t.title}</span>
                    {t.time_start && <span className="text-[10px] text-slate-600">{t.time_start}</span>}
                  </div>
                ))}
                {todayPlan.length > 4 && <div className="text-[11px] text-slate-600 pl-6">+{todayPlan.length - 4} görev daha</div>}
              </div>
            ) : (
              <Link href="/plan" className="block text-center py-3 text-xs text-slate-500 hover:text-primary-light transition-colors">
                + Plan oluştur
              </Link>
            )}
          </div>

          <Pomodoro />

          {/* Seviye */}
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-semibold">Seviye {level}</div>
              <div className="text-xs text-primary-light font-bold">{user?.xp||0} XP</div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1"><div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{width:`${(levelXp/500)*100}%`}}/></div>
            <div className="text-[10px] text-slate-500">{levelXp}/500 → Lv.{level+1}</div>
          </div>

          {/* Rozetler önizleme */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-semibold">🎖️ Rozetler</div>
              <Link href="/liderlik" className="text-xs text-primary-light">{badges?.earnedCount||0}/{badges?.total||10} →</Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {badges?.badges?.slice(0,8).map((b:any)=>(
                <div key={b.type} className={`aspect-square rounded-lg flex items-center justify-center text-xl ${b.earned?'bg-[#253347]':'bg-[#0F172A] opacity-30 grayscale'}`} title={b.title}>
                  {b.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
