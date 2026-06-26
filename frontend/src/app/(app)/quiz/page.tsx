'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Phase = 'setup' | 'quiz' | 'result';
const LETTERS = ['A','B','C','D','E'];

export default function QuizPage() {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [selectedPdf, setSelectedPdf] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<Phase>('setup');
  const [result, setResult] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/pdfs').then(r => setPdfs(r.data)); }, []);

  const startQuiz = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (selectedPdf) params.pdfId = selectedPdf;
      const { data } = await api.get('/questions', { params });
      if (!data.length) { toast.error('Önce PDF yükleyip soru üret'); return; }
      setQuestions(data);
      setAnswers({});
      setCurrent(0);
      setPhase('quiz');
    } finally { setLoading(false); }
  };

  const submit = async () => {
    const ans = questions.map(q => ({ questionId: q.id, selected: answers[q.id] || '' }));
    const { data } = await api.post('/quiz/submit', { answers: ans });
    setResult(data);
    setPhase('result');
  };

  const q = questions[current];

  if (phase === 'setup') return (
    <div className="p-7 max-w-lg">
      <h1 className="text-xl font-bold mb-6">📝 Quiz</h1>
      <div className="card space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Kaynak PDF (opsiyonel)</label>
          <select value={selectedPdf} onChange={e => setSelectedPdf(e.target.value)} className="input">
            <option value="">Tüm sorular</option>
            {pdfs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <button onClick={startQuiz} disabled={loading} className="btn-primary w-full">
          {loading ? 'Yükleniyor...' : 'Başla →'}
        </button>
      </div>
    </div>
  );

  if (phase === 'result') return (
    <div className="p-7 max-w-md mx-auto text-center">
      <div className="text-5xl mb-4">{result.netScore >= 30 ? '🏆' : result.netScore >= 15 ? '📈' : '💪'}</div>
      <h2 className="text-xl font-black mb-6">Bitti!</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card text-center"><div className="text-3xl font-black text-primary-light">{result.netScore}</div><div className="text-xs text-slate-500 mt-1">Net</div></div>
        <div className="card text-center"><div className="text-3xl font-black text-success">{result.correct}</div><div className="text-xs text-slate-500 mt-1">Doğru</div></div>
        <div className="card text-center"><div className="text-3xl font-black text-red-400">{result.wrong}</div><div className="text-xs text-slate-500 mt-1">Yanlış</div></div>
        <div className="card text-center"><div className="text-3xl font-black text-slate-500">{result.empty}</div><div className="text-xs text-slate-500 mt-1">Boş</div></div>
      </div>
      {result.xpEarned > 0 && <div className="mb-4 px-4 py-2 rounded-lg bg-primary/10 text-primary-light text-sm font-semibold">+{result.xpEarned} XP kazandın! ⭐</div>}
      <div className="flex gap-3">
        <button onClick={() => setPhase('setup')} className="flex-1 btn-secondary">← Geri</button>
        <button onClick={startQuiz} className="flex-1 btn-primary">Tekrar</button>
      </div>
    </div>
  );

  // Quiz phase
  return (
    <div className="p-7 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">Soru <strong className="text-white">{current+1}</strong> / {questions.length}</span>
        <button onClick={submit} className="btn-danger text-xs py-1.5">Bitir</button>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current+1)/questions.length)*100}%` }} />
      </div>

      <div className="card mb-4">
        <p className="text-[15px] leading-relaxed font-medium mb-6">{q.text}</p>
        <div className="space-y-2">
          {(q.options as string[]).map((opt, i) => {
            const letter = LETTERS[i];
            const selected = answers[q.id] === letter;
            return (
              <div key={i} onClick={() => setAnswers(p => ({...p, [q.id]: letter}))}
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${selected ? 'border-primary bg-primary/10' : 'border-white/[0.08] hover:border-primary/40 hover:bg-primary/5'}`}>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected ? 'border-primary text-primary-light bg-primary/20' : 'border-white/20 text-slate-500'}`}>{letter}</div>
                <span className="text-sm">{opt.replace(/^[A-E]\)\s*/, '')}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setCurrent(p => Math.max(0, p-1))} disabled={current===0} className="btn-secondary">← Önceki</button>
        {current < questions.length-1
          ? <button onClick={() => setCurrent(p => p+1)} className="btn-primary">Sonraki →</button>
          : <button onClick={submit} className="btn-primary">✓ Tamamla</button>
        }
      </div>
    </div>
  );
}
