'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function FlashcardPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ total: 0, due: 0 });

  const load = async () => {
    const [dueRes, allRes] = await Promise.all([
      api.get('/flashcards/due'),
      api.get('/flashcards'),
    ]);
    setCards(dueRes.data);
    setStats({ due: dueRes.data.length, total: allRes.data.length });
    setIdx(0); setFlipped(false); setDone(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (quality: number) => {
    const card = cards[idx];
    await api.post(`/flashcards/${card.id}/review`, { quality });
    setFlipped(false);
    if (idx + 1 >= cards.length) { setDone(true); toast.success('🎉 Tüm kartlar tamam!'); }
    else setIdx(p => p + 1);
  };

  const card = cards[idx];

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">🃏 Flashcard</h1>
        <div className="flex gap-3 text-sm">
          <span className="badge-yellow">{stats.due} bugün</span>
          <span className="badge-blue">{stats.total} toplam</span>
        </div>
      </div>

      {done || cards.length === 0 ? (
        <div className="card text-center py-14 max-w-md mx-auto">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-semibold mb-1">{cards.length === 0 ? 'Bugün kart yok' : 'Hepsi tamam!'}</p>
          <p className="text-sm text-slate-400 mb-5">PDF'den flashcard üretmek için PDF sayfasına git.</p>
          <button onClick={load} className="btn-primary">Yenile</button>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {/* Progress */}
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>{idx+1} / {cards.length}</span>
            <span>Tıkla → çevir</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full mb-5 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(idx/cards.length)*100}%` }} />
          </div>

          {/* Card */}
          <div onClick={() => setFlipped(f => !f)} className="cursor-pointer" style={{ perspective: 1000 }}>
            <div style={{ transformStyle: 'preserve-3d', transition: 'transform 0.4s', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', position: 'relative', height: 220 }}>
              {/* Front */}
              <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                className="card rounded-2xl flex flex-col items-center justify-center text-center p-7">
                <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Soru</div>
                <p className="text-base font-medium leading-relaxed">{card?.front}</p>
              </div>
              {/* Back */}
              <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
                className="rounded-2xl border border-primary/25 bg-primary/10 flex flex-col items-center justify-center text-center p-7">
                <div className="text-[10px] uppercase tracking-widest text-primary-light mb-3">Cevap</div>
                <p className="text-sm leading-relaxed">{card?.back}</p>
              </div>
            </div>
          </div>

          {/* Buttons — only when flipped */}
          {flipped ? (
            <div className="flex gap-2 mt-5 justify-center">
              {[
                { label: '🔄 Tekrar', q: 0, cls: 'bg-red-500/15 text-red-400 hover:bg-red-500/25' },
                { label: '😅 Zor', q: 1, cls: 'btn-secondary' },
                { label: '👍 İyi', q: 3, cls: 'btn-secondary' },
                { label: '🎯 Kolay', q: 5, cls: 'btn-primary' },
              ].map(b => (
                <button key={b.label} onClick={() => review(b.q)} className={`btn ${b.cls} text-sm`}>{b.label}</button>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-600 mt-4">Cevabı görmek için kartı çevir</p>
          )}
        </div>
      )}
    </div>
  );
}
