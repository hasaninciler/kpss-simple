'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';

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
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { api.get('/pdfs').then(r => setPdfs(r.data)); }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'quiz') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startTime]);

  const startQuiz = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (selectedPdf) params.pdfId = selectedPdf;
      const { data } = await api.get('/questions', { params });
      if (!data.length) { toast.error('Önce soru üret (Soru Üret sayfası)'); setLoading(false); return; }
      setQuestions(data);
      setAnswers({});
      setCurrent(0);
      setStartTime(Date.now());
      setElapsed(0);
      setPhase('quiz');
    } finally { setLoading(false); }
  };

  const submit = async () => {
    const ans = questions.map(q => ({ questionId: q.id, selected: answers[q.id] || '' }));
    const { data } = await api.post('/quiz/submit', { answers: ans });

    // Yanlışları kaydet
    const wrongQuestions = questions
      .filter(q => answers[q.id] && answers[q.id] !== q.correct_answer)
      .map(q => ({
        text: q.text, options: q.options, correct_answer: q.correct_answer,
        explanation: q.explanation, user_answer: answers[q.id], subject: q.subject,
      }));
    if (wrongQuestions.length > 0) {
      api.post('/study/wrong', { questions: wrongQuestions }).catch(() => {});
    }

    // Günlük görev
    api.post('/study/daily/increment', { type: 'questions', amount: questions.length }).catch(() => {});

    setResult({ ...data, duration: elapsed, questions, answers });
    setPhase('result');
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const q = questions[current];

  // ── SETUP ──
  if (phase === 'setup') return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-lg md:text-xl font-bold mb-1">📝 Quiz Çöz</h1>
      <p className="text-xs text-slate-500 mb-5">Ürettiğin sorularla kendini test et</p>

      <div className="card space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Hangi sorulardan?</label>
          <select value={selectedPdf} onChange={e => setSelectedPdf(e.target.value)} className="input">
            <option value="">🎲 Karışık (tüm sorular)</option>
            {pdfs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <button onClick={startQuiz} disabled={loading} className="btn-primary w-full">
          {loading ? 'Hazırlanıyor...' : '▶ Quiz Başlat'}
        </button>
        <p className="text-[11px] text-slate-500 text-center">
          Soru yoksa <a href="/pdf" className="text-primary-light">Soru Üret</a> ya da <a href="/konular" className="text-primary-light">Konular</a> sayfasından üret
        </p>
      </div>
    </div>
  );

  // ── RESULT ──
  if (phase === 'result' && result) {
    const correctPct = Math.round((result.correct / result.total) * 100);
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{result.netScore >= 15 ? '🏆' : result.netScore >= 8 ? '📈' : '💪'}</div>
          <h2 className="text-xl font-black">Quiz Bitti!</h2>
          <p className="text-xs text-slate-500 mt-1">⏱ {fmt(result.duration)} sürede tamamladın</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="card text-center"><div className="text-4xl font-black text-primary-light">{result.netScore}</div><div className="text-xs text-slate-500 mt-1">NET</div></div>
          <div className="card text-center"><div className="text-4xl font-black text-success">{correctPct}%</div><div className="text-xs text-slate-500 mt-1">BAŞARI</div></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="card text-center py-3"><div className="text-2xl font-bold text-success">{result.correct}</div><div className="text-[10px] text-slate-500">Doğru</div></div>
          <div className="card text-center py-3"><div className="text-2xl font-bold text-red-400">{result.wrong}</div><div className="text-[10px] text-slate-500">Yanlış</div></div>
          <div className="card text-center py-3"><div className="text-2xl font-bold text-slate-500">{result.empty}</div><div className="text-[10px] text-slate-500">Boş</div></div>
        </div>

        {result.xpEarned > 0 && <div className="card mb-4 bg-primary/10 border-primary/20 text-center text-sm font-semibold text-primary-light">+{result.xpEarned} XP kazandın! ⭐</div>}
        {result.wrong > 0 && (
          <div className="card mb-4 bg-warning/5 border-warning/20 flex items-center gap-3">
            <div className="text-xl">📕</div>
            <div className="flex-1"><div className="text-sm font-medium text-warning">{result.wrong} yanlış deftere eklendi</div><div className="text-[11px] text-slate-500">Yanlışlarım sayfasından tekrar çöz</div></div>
            <a href="/yanlislarim" className="text-xs text-primary-light">Git →</a>
          </div>
        )}

        {/* Detaylı inceleme */}
        <details className="card mb-4">
          <summary className="text-sm font-medium cursor-pointer">📋 Cevapları İncele</summary>
          <div className="space-y-3 mt-3 max-h-96 overflow-y-auto">
            {result.questions.map((q: any, i: number) => {
              const userAns = result.answers[q.id];
              const correct = userAns === q.correct_answer;
              return (
                <div key={i} className="bg-[#0F172A] rounded-xl p-3 border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1.5">
                    {correct ? <CheckCircle size={14} className="text-success" /> : userAns ? <XCircle size={14} className="text-red-400" /> : <Clock size={14} className="text-slate-500" />}
                    <span className="text-[10px] text-slate-500">Soru {i+1}</span>
                  </div>
                  <p className="text-xs font-medium mb-2">{q.text}</p>
                  <div className="text-[11px] space-y-0.5">
                    <div className="text-success">✓ Doğru: {q.correct_answer}) {(q.options as string[])[LETTERS.indexOf(q.correct_answer)]?.replace(/^[A-E]\)\s*/,'')}</div>
                    {userAns && !correct && <div className="text-red-400">✗ Senin: {userAns})</div>}
                  </div>
                  {q.explanation && <div className="text-[10px] text-slate-500 mt-1.5 bg-white/[0.02] rounded p-1.5">💡 {q.explanation}</div>}
                </div>
              );
            })}
          </div>
        </details>

        <div className="flex gap-3">
          <button onClick={() => setPhase('setup')} className="flex-1 btn-secondary">← Çıkış</button>
          <button onClick={startQuiz} className="flex-1 btn-primary"><RotateCcw size={14} className="inline mr-1" /> Tekrar Çöz</button>
        </div>
      </div>
    );
  }

  // ── QUIZ ──
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">Soru <strong className="text-white">{current+1}</strong>/{questions.length}</span>
        <div className="flex items-center gap-2 text-sm font-mono font-bold text-primary-light px-3 py-1.5 rounded-lg bg-primary/10">
          <Clock size={14} /> {fmt(elapsed)}
        </div>
        <button onClick={() => confirm('Bitir?') && submit()} className="btn-danger text-xs py-1.5">Bitir</button>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current+1)/questions.length)*100}%` }} />
      </div>

      <div className="card mb-4">
        <p className="text-[15px] leading-relaxed font-medium mb-5">{q.text}</p>
        <div className="space-y-2">
          {(q.options as string[]).map((opt, i) => {
            const letter = LETTERS[i];
            const sel = answers[q.id] === letter;
            return (
              <button key={i} onClick={() => setAnswers(p => ({...p, [q.id]: letter}))}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${sel ? 'border-primary bg-primary/10' : 'border-white/[0.08] hover:border-primary/40 hover:bg-primary/5'}`}>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${sel ? 'border-primary text-primary-light bg-primary/20' : 'border-white/20 text-slate-500'}`}>{letter}</div>
                <span className="text-sm">{opt.replace(/^[A-E]\)\s*/, '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Soru navigasyon noktaları */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {questions.map((qq, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-all ${i === current ? 'bg-primary text-white' : answers[qq.id] ? 'bg-success/20 text-success' : 'bg-[#253347] text-slate-500'}`}>
            {i+1}
          </button>
        ))}
      </div>

      <div className="flex justify-between gap-3">
        <button onClick={() => setCurrent(p => Math.max(0, p-1))} disabled={current===0} className="btn-secondary disabled:opacity-30">← Önceki</button>
        {current < questions.length-1
          ? <button onClick={() => setCurrent(p => p+1)} className="btn-primary">Sonraki →</button>
          : <button onClick={() => submit()} className="btn-primary">✓ Bitir & Sonuç</button>
        }
      </div>
    </div>
  );
}
