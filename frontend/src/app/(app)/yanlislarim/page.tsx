'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, RotateCcw, CreditCard, BookX } from 'lucide-react';

const LETTERS = ['A','B','C','D','E'];

export default function YanlislarimPage() {
  const [wrongs, setWrongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    api.get('/study/wrong').then(r => setWrongs(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const checkAnswer = (id: number, q: any, letter: string) => {
    setSelected(p => ({ ...p, [id]: letter }));
    setRevealed(p => ({ ...p, [id]: true }));
    if (letter === q.correct_answer) {
      setTimeout(() => markSolved(id), 1200);
    }
  };

  const markSolved = async (id: number) => {
    await api.post(`/study/wrong/${id}/solved`);
    setWrongs(p => p.filter(w => w.id !== id));
    toast.success('Tebrikler! Bu soruyu artık biliyorsun 🎉');
  };

  const makeFlashcards = async () => {
    const t = toast.loading('Flashcardlar oluşturuluyor...');
    try {
      const { data } = await api.post('/study/wrong-to-flashcards');
      toast.success(`${data.count} flashcard oluşturuldu!`, { id: t });
    } catch { toast.error('Hata', { id: t }); }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg md:text-xl font-bold">📕 Yanlışlarım Defteri</h1>
        {wrongs.length > 0 && (
          <button onClick={makeFlashcards} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/15 text-purple-300 text-xs hover:bg-secondary/25 transition-colors">
            <CreditCard size={13} /> Flashcard Yap
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">Yanlış yaptığın sorular burada. Tekrar çöz, öğren, sil.</p>

      {loading ? (
        <div className="text-center py-12 text-slate-600 text-sm">Yükleniyor...</div>
      ) : wrongs.length === 0 ? (
        <div className="card text-center py-12">
          <BookX size={40} className="mx-auto text-slate-600 mb-3" />
          <div className="text-sm font-medium mb-1">Yanlışın yok! 🎉</div>
          <p className="text-xs text-slate-500">Quiz çözünce yanlışların buraya birikir, tekrar çözebilirsin.</p>
        </div>
      ) : (
        <>
          <div className="card mb-4 bg-warning/5 border-warning/20 flex items-center gap-3">
            <div className="text-2xl">📚</div>
            <div>
              <div className="text-sm font-semibold text-warning">{wrongs.length} soru tekrar bekliyor</div>
              <div className="text-xs text-slate-500">Doğru cevabı bulunca soru defterden silinir</div>
            </div>
          </div>

          <div className="space-y-3">
            {wrongs.map((w) => (
              <div key={w.id} className="card">
                <div className="flex items-center gap-2 mb-2">
                  {w.subject && <span className="badge-blue text-[10px]">{w.subject}</span>}
                  <span className="text-[10px] text-slate-500">{new Date(w.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <p className="text-sm font-medium leading-relaxed mb-3">{w.question_text}</p>
                <div className="space-y-1.5">
                  {(w.options as string[]).map((opt, i) => {
                    const letter = LETTERS[i];
                    const sel = selected[w.id] === letter;
                    const rev = revealed[w.id];
                    const correct = w.correct_answer === letter;
                    let cls = 'bg-[#0F172A] text-slate-400 hover:bg-[#253347]';
                    if (rev) {
                      if (correct) cls = 'bg-success/15 text-success border border-success/30';
                      else if (sel) cls = 'bg-red-500/15 text-red-400 border border-red-500/30';
                    } else if (sel) cls = 'bg-primary/15 text-primary-light';
                    return (
                      <button key={i} onClick={() => !rev && checkAnswer(w.id, w, letter)}
                        className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${cls}`}>
                        <span className="font-bold">{letter})</span>
                        <span>{opt.replace(/^[A-E]\)\s*/, '')}</span>
                        {rev && correct && <CheckCircle size={13} className="ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {revealed[w.id] && (
                  <div className="mt-3 space-y-2">
                    {w.explanation && (
                      <div className="p-2.5 rounded-lg bg-white/[0.03] text-xs text-slate-400 leading-relaxed">
                        💡 {w.explanation}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setRevealed(p => ({...p,[w.id]:false})); setSelected(p => {const n={...p};delete n[w.id];return n;}); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#253347] text-slate-300 text-xs">
                        <RotateCcw size={12} /> Tekrar Dene
                      </button>
                      <button onClick={() => markSolved(w.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/15 text-success text-xs">
                        <CheckCircle size={12} /> Öğrendim, Sil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
