'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';

const MODES = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS = { work: 'Çalışma', short: 'Kısa Mola', long: 'Uzun Mola' };
const COLORS = { work: '#4F46E5', short: '#22C55E', long: '#F59E0B' };

type Mode = 'work' | 'short' | 'long';

// localStorage key
const STORE = 'kpss_pomodoro';

interface PomoState {
  mode: Mode;
  endAt: number | null;   // bitiş zamanı (timestamp), çalışıyorsa
  remaining: number;       // duraklatılmışsa kalan saniye
  running: boolean;
  sessions: number;
}

function loadState(): PomoState {
  if (typeof window === 'undefined') return { mode: 'work', endAt: null, remaining: MODES.work, running: false, sessions: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || '');
    if (s && typeof s.remaining === 'number') return s;
  } catch {}
  return { mode: 'work', endAt: null, remaining: MODES.work, running: false, sessions: 0 };
}

function saveState(s: PomoState) {
  localStorage.setItem(STORE, JSON.stringify(s));
}

export default function PomodoroWidget() {
  const [state, setState] = useState<PomoState>({ mode: 'work', endAt: null, remaining: MODES.work, running: false, sessions: 0 });
  const [display, setDisplay] = useState(MODES.work);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tickRef = useRef<any>(null);

  // İlk yüklemede state'i localStorage'dan al
  useEffect(() => {
    const s = loadState();
    setState(s);
    setMounted(true);
  }, []);

  // Kalan süreyi hesapla
  const calcRemaining = (s: PomoState) => {
    if (s.running && s.endAt) {
      return Math.max(0, Math.round((s.endAt - Date.now()) / 1000));
    }
    return s.remaining;
  };

  // Her saniye güncelle
  useEffect(() => {
    if (!mounted) return;
    tickRef.current = setInterval(() => {
      setState(prev => {
        if (prev.running && prev.endAt) {
          const rem = Math.max(0, Math.round((prev.endAt - Date.now()) / 1000));
          if (rem <= 0) {
            // Süre bitti
            const finished = { ...prev, running: false, endAt: null, remaining: MODES[prev.mode] };
            if (prev.mode === 'work') {
              finished.sessions = prev.sessions + 1;
              api.post('/social/study-log', { minutes: 25 }).catch(() => {});
            }
            saveState(finished);
            setDisplay(MODES[prev.mode]);
            // Bildirim sesi (basit beep)
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.connect(ctx.destination);
              osc.frequency.value = 800;
              osc.start(); osc.stop(ctx.currentTime + 0.3);
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
  }, [mounted]);

  const start = () => {
    setState(prev => {
      const rem = calcRemaining(prev);
      const ns = { ...prev, running: true, endAt: Date.now() + rem * 1000, remaining: rem };
      saveState(ns);
      return ns;
    });
  };

  const pause = () => {
    setState(prev => {
      const rem = calcRemaining(prev);
      const ns = { ...prev, running: false, endAt: null, remaining: rem };
      saveState(ns);
      return ns;
    });
  };

  const reset = () => {
    setState(prev => {
      const ns = { ...prev, running: false, endAt: null, remaining: MODES[prev.mode] };
      saveState(ns);
      setDisplay(MODES[prev.mode]);
      return ns;
    });
  };

  const switchMode = (mode: Mode) => {
    setState(prev => {
      const ns = { ...prev, mode, running: false, endAt: null, remaining: MODES[mode] };
      saveState(ns);
      setDisplay(MODES[mode]);
      return ns;
    });
  };

  if (!mounted) return null;

  const mm = String(Math.floor(display / 60)).padStart(2, '0');
  const ss = String(display % 60).padStart(2, '0');
  const pct = ((MODES[state.mode] - display) / MODES[state.mode]) * 100;
  const color = COLORS[state.mode];

  return (
    <>
      {/* Üstte mini sayaç (her sayfada) */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:bg-white/5"
        style={{ borderColor: state.running ? color + '50' : 'rgba(255,255,255,0.08)', background: state.running ? color + '12' : 'transparent' }}
      >
        <Timer size={14} style={{ color: state.running ? color : '#64748B' }} className={state.running ? 'animate-pulse' : ''} />
        <span className="font-mono text-sm font-bold" style={{ color: state.running ? color : '#94A3B8' }}>{mm}:{ss}</span>
        <span className="text-[10px] text-slate-500 hidden sm:inline">{LABELS[state.mode]}</span>
      </button>

      {/* Büyük panel (tıklayınca açılır) */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#1E293B] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="text-base font-bold flex items-center gap-2"><Timer size={18} className="text-primary-light" /> Pomodoro</div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>

            {/* Mode seçici */}
            <div className="flex gap-1.5 mb-6 bg-[#0F172A] p-1 rounded-xl">
              {(Object.keys(MODES) as Mode[]).map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${state.mode === m ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                  style={state.mode === m ? { background: COLORS[m] + '30', border: `1px solid ${COLORS[m]}` } : {}}>
                  {LABELS[m]}
                </button>
              ))}
            </div>

            {/* Büyük halka timer */}
            <div className="flex justify-center mb-6">
              <div className="relative w-52 h-52">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#0F172A" strokeWidth="6" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s linear' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-black font-mono tracking-tight">{mm}:{ss}</div>
                  <div className="text-xs text-slate-500 mt-1">{LABELS[state.mode]}</div>
                  <div className="text-[10px] text-slate-600 mt-2">🍅 {state.sessions} seans tamamlandı</div>
                </div>
              </div>
            </div>

            {/* Kontroller */}
            <div className="flex gap-2">
              <button onClick={state.running ? pause : start}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-all"
                style={{ background: color }}>
                {state.running ? <><Pause size={18} /> Durdur</> : <><Play size={18} /> Başlat</>}
              </button>
              <button onClick={reset} className="px-4 py-3 rounded-xl bg-[#253347] text-slate-400 hover:text-white transition-colors">
                <RotateCcw size={18} />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 text-center mt-4">
              Sayaç sayfa değiştirsen de çalışmaya devam eder ⏱
            </p>
          </div>
        </div>
      )}
    </>
  );
}
