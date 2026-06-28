'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Play, Pause, RotateCcw, X, Timer, Settings, Plus, Minus } from 'lucide-react';

const LABELS = { work: 'Çalışma', short: 'Kısa Mola', long: 'Uzun Mola' };
const COLORS = { work: '#4F46E5', short: '#22C55E', long: '#F59E0B' };

type Mode = 'work' | 'short' | 'long';

const STORE = 'kpss_pomodoro';
const DUR_STORE = 'kpss_pomodoro_durations';

// Kullanıcının ayarladığı süreler (dakika)
function loadDurations() {
  if (typeof window === 'undefined') return { work: 25, short: 5, long: 15 };
  try {
    const d = JSON.parse(localStorage.getItem(DUR_STORE) || '');
    if (d && d.work) return d;
  } catch {}
  return { work: 25, short: 5, long: 15 };
}

interface PomoState {
  mode: Mode;
  endAt: number | null;
  remaining: number;
  running: boolean;
  sessions: number;
}

function loadState(durations: any): PomoState {
  if (typeof window === 'undefined') return { mode: 'work', endAt: null, remaining: durations.work * 60, running: false, sessions: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || '');
    if (s && typeof s.remaining === 'number') return s;
  } catch {}
  return { mode: 'work', endAt: null, remaining: durations.work * 60, running: false, sessions: 0 };
}

function saveState(s: PomoState) { localStorage.setItem(STORE, JSON.stringify(s)); }

export default function PomodoroWidget() {
  const [durations, setDurations] = useState({ work: 25, short: 5, long: 15 });
  const [state, setState] = useState<PomoState>({ mode: 'work', endAt: null, remaining: 25 * 60, running: false, sessions: 0 });
  const [display, setDisplay] = useState(25 * 60);
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tickRef = useRef<any>(null);

  const MODE_SECONDS = (m: Mode) => durations[m] * 60;

  useEffect(() => {
    const d = loadDurations();
    setDurations(d);
    const s = loadState(d);
    setState(s);
    setMounted(true);
  }, []);

  const calcRemaining = (s: PomoState) => {
    if (s.running && s.endAt) return Math.max(0, Math.round((s.endAt - Date.now()) / 1000));
    return s.remaining;
  };

  useEffect(() => {
    if (!mounted) return;
    tickRef.current = setInterval(() => {
      setState(prev => {
        if (prev.running && prev.endAt) {
          const rem = Math.max(0, Math.round((prev.endAt - Date.now()) / 1000));
          if (rem <= 0) {
            const finished = { ...prev, running: false, endAt: null, remaining: durations[prev.mode] * 60 };
            if (prev.mode === 'work') {
              finished.sessions = prev.sessions + 1;
              api.post('/social/study-log', { minutes: durations.work }).catch(() => {});
            }
            saveState(finished);
            setDisplay(durations[prev.mode] * 60);
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 800; gain.gain.value = 0.3;
              osc.start(); osc.stop(ctx.currentTime + 0.4);
            } catch {}
            return finished;
          }
          setDisplay(rem);
          return prev;
        }
        setDisplay(prev.remaining);
        return prev;
      });
    }, 250);
    return () => clearInterval(tickRef.current);
  }, [mounted, durations]);

  const start = () => setState(prev => {
    const rem = calcRemaining(prev);
    const ns = { ...prev, running: true, endAt: Date.now() + rem * 1000, remaining: rem };
    saveState(ns); return ns;
  });

  const pause = () => setState(prev => {
    const rem = calcRemaining(prev);
    const ns = { ...prev, running: false, endAt: null, remaining: rem };
    saveState(ns); return ns;
  });

  const reset = () => setState(prev => {
    const ns = { ...prev, running: false, endAt: null, remaining: MODE_SECONDS(prev.mode) };
    saveState(ns); setDisplay(MODE_SECONDS(prev.mode)); return ns;
  });

  const switchMode = (mode: Mode) => setState(prev => {
    const ns = { ...prev, mode, running: false, endAt: null, remaining: durations[mode] * 60 };
    saveState(ns); setDisplay(durations[mode] * 60); return ns;
  });

  // Süre ayarla
  const changeDuration = (mode: Mode, delta: number) => {
    setDurations(prev => {
      const newVal = Math.max(1, Math.min(120, prev[mode] + delta));
      const nd = { ...prev, [mode]: newVal };
      localStorage.setItem(DUR_STORE, JSON.stringify(nd));
      // Eğer şu an o moddaysak ve çalışmıyorsak, ekranı güncelle
      setState(s => {
        if (s.mode === mode && !s.running) {
          const ns = { ...s, remaining: newVal * 60 };
          saveState(ns); setDisplay(newVal * 60); return ns;
        }
        return s;
      });
      return nd;
    });
  };

  if (!mounted) return null;

  const mm = String(Math.floor(display / 60)).padStart(2, '0');
  const ss = String(display % 60).padStart(2, '0');
  const total = MODE_SECONDS(state.mode);
  const pct = ((total - display) / total) * 100;
  const color = COLORS[state.mode];

  return (
    <>
      {/* ÜST BAR — daha belirgin mini sayaç */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 transition-all hover:scale-105"
        style={{
          borderColor: state.running ? color : 'rgba(255,255,255,0.12)',
          background: state.running ? color + '20' : '#1E293B',
          boxShadow: state.running ? `0 0 16px ${color}40` : 'none',
        }}
      >
        <div className="relative">
          <Timer size={18} style={{ color: state.running ? color : '#94A3B8' }} className={state.running ? 'animate-pulse' : ''} />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="font-mono text-base font-black tracking-tight" style={{ color: state.running ? color : '#E2E8F0' }}>{mm}:{ss}</span>
          <span className="text-[9px] text-slate-500 mt-0.5">{LABELS[state.mode]}{state.running ? ' • çalışıyor' : ''}</span>
        </div>
        {!state.running && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: color }}>
            <Play size={11} className="text-white ml-0.5" />
          </div>
        )}
      </button>

      {/* BÜYÜK PANEL */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { setOpen(false); setShowSettings(false); }} />
          <div className="relative w-full max-w-sm bg-[#1E293B] border border-white/[0.08] rounded-3xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="text-lg font-bold flex items-center gap-2"><Timer size={20} style={{ color }} /> Pomodoro</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowSettings(s => !s)} className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary/20 text-primary-light' : 'text-slate-500 hover:text-white'}`}>
                  <Settings size={17} />
                </button>
                <button onClick={() => { setOpen(false); setShowSettings(false); }} className="p-2 text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
            </div>

            {/* AYARLAR PANELİ */}
            {showSettings ? (
              <div className="space-y-3 mb-4">
                <div className="text-sm font-semibold text-slate-300 mb-3">⏱ Süreleri Ayarla (dakika)</div>
                {(Object.keys(LABELS) as Mode[]).map(m => (
                  <div key={m} className="flex items-center justify-between p-3 rounded-xl bg-[#0F172A]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[m] }} />
                      <span className="text-sm font-medium">{LABELS[m]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeDuration(m, -5)} className="w-8 h-8 rounded-lg bg-[#253347] text-slate-400 hover:text-white flex items-center justify-center"><Minus size={14} /></button>
                      <span className="w-12 text-center font-mono font-bold text-lg" style={{ color: COLORS[m] }}>{durations[m]}</span>
                      <button onClick={() => changeDuration(m, 5)} className="w-8 h-8 rounded-lg bg-[#253347] text-slate-400 hover:text-white flex items-center justify-center"><Plus size={14} /></button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 w-full mb-1">Hızlı ayar (çalışma):</span>
                  {[25, 30, 45, 50, 60].map(v => (
                    <button key={v} onClick={() => changeDuration('work', v - durations.work)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${durations.work === v ? 'bg-primary text-white' : 'bg-[#253347] text-slate-400 hover:text-white'}`}>
                      {v}dk
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowSettings(false)} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium mt-2">
                  Tamam
                </button>
              </div>
            ) : (
              <>
                {/* Mode seçici */}
                <div className="flex gap-1.5 mb-6 bg-[#0F172A] p-1 rounded-xl">
                  {(Object.keys(LABELS) as Mode[]).map(m => (
                    <button key={m} onClick={() => switchMode(m)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${state.mode === m ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                      style={state.mode === m ? { background: COLORS[m] + '30', border: `1px solid ${COLORS[m]}` } : {}}>
                      {LABELS[m]}
                      <div className="text-[9px] opacity-70 mt-0.5">{durations[m]}dk</div>
                    </button>
                  ))}
                </div>

                {/* Halka timer */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-56 h-56">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#0F172A" strokeWidth="7" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="7"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.3s linear', filter: state.running ? `drop-shadow(0 0 6px ${color}80)` : 'none' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-6xl font-black font-mono tracking-tight">{mm}:{ss}</div>
                      <div className="text-xs text-slate-500 mt-1">{LABELS[state.mode]}</div>
                      <div className="text-[10px] text-slate-600 mt-2">🍅 {state.sessions} seans</div>
                    </div>
                  </div>
                </div>

                {/* Kontroller */}
                <div className="flex gap-2">
                  <button onClick={state.running ? pause : start}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90"
                    style={{ background: color, boxShadow: `0 4px 20px ${color}50` }}>
                    {state.running ? <><Pause size={20} /> Durdur</> : <><Play size={20} /> Başlat</>}
                  </button>
                  <button onClick={reset} className="px-5 py-3.5 rounded-2xl bg-[#253347] text-slate-400 hover:text-white transition-colors">
                    <RotateCcw size={20} />
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 text-center mt-4">
                  ⚙️ ile süreleri değiştir • Sayfa değişse de çalışır
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
