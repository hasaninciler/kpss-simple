'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, RotateCcw, Zap } from 'lucide-react';
import Link from 'next/link';

const LETTERS = ['A','B','C','D','E'];

export default function QuizPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<'loading'|'quiz'|'result'|'empty'>('loading');
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [source, setSource] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    // Önce üretilmiş quiz var mı bak
    const gen = localStorage.getItem('kpss_generated_quiz');
    if (gen) {
      try {
        const data = JSON.parse(gen);
        if (data.questions?.length) {
          setQuestions(data.questions);
          setSource(data.source || 'Üretilen Sorular');
          setStartTime(Date.now());
          setPhase('quiz');
          localStorage.removeItem('kpss_generated_quiz'); // bir kez kullan
          return;
        }
      } catch {}
    }
    // Yoksa kayıtlı sorulardan çek
    api.get('/questions', { params: { limit: 20 } }).then(r => {
      if (r.data.length) {
        setQuestions(r.data);
        setSource('Kayıtlı Sorular');
        setStartTime(Date.now());
        setPhase('quiz');
      } else {
        setPhase('empty');
      }
    }).catch(() => setPhase('empty'));
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'quiz') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startTime]);

  const submit = async () => {
    let correct = 0, wrong = 0, empty = 0;
    questions.forEach(q => {
      const a = answers[questions.indexOf(q)];
      if (!a) empty++;
      else if (a === q.correct_answer) correct++;
      else wrong++;
    });
    const net = Math.round((correct - wrong * 0.25) * 10) / 10;

    // Yanlışları deftere kaydet
    const wrongs = questions.filter((q, i) => answers[i] && answers[i] !== q.correct_answer)
      .map((q, i) => ({ text: q.text, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, user_answer: answers[questions.indexOf(q)], subject: q.subject }));
    if (wrongs.length) api.post('/study/wrong', { questions: wrongs }).catch(() => {});
    api.post('/study/daily/increment', { type: 'questions', amount: questions.length }).catch(() => {});
    if (questions[0]?.id) {
      api.post('/quiz/submit', { answers: questions.map((q, i) => ({ questionId: q.id, selected: answers[i] || '' })) }).catch(() => {});
    }

    setResult({ correct, wrong, empty, net, total: questions.length, duration: elapsed });
    setPhase('result');
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // BOŞ
  if (phase === 'empty') return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="card text-center py-12">
        <div className="text-4xl mb-3">📝</div>
        <div className="text-base font-semibold mb-1">Henüz soru yok</div>
        <p className="text-sm text-slate-500 mb-5">AI ile konu seçip soru üret, sonra burada çöz.</p>
        <Link href="/pdf" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-sm font-medium transition-colors">
          <Zap size={15} /> Soru Üret
        </Link>
      </div>
    </div>
  );

  if (phase === 'loading') return <div className="p-6 text-center text-slate-500 text-sm">Yükleniyor...</div>;

  // SONUÇ
  if (phase === 'result' && result) {
    const pct = Math.round((result.correct / result.total) * 100);
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{result.net >= result.total*0.7 ? '🏆' : result.net >= result.total*0.4 ? '📈' : '💪'}</div>
          <h2 className="text-xl font-black">Quiz Bitti!</h2>
          <p className="text-xs text-slate-500 mt-1">⏱ {fmt(result.duration)} · {source}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="card text-center"><div className="text-4xl font-black text-primary-light">{result.net}</div><div className="text-xs text-slate-500 mt-1">NET</div></div>
          <div className="card text-center"><div className="text-4xl font-black text-success">{pct}%</div><div className="text-xs text-slate-500 mt-1">BAŞARI</div></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="card text-center py-3"><div className="text-2xl font-bold text-success">{result.correct}</div><div className="text-[10px] text-slate-500">Doğru</div></div>
          <div className="card text-center py-3"><div className="text-2xl font-bold text-red-400">{result.wrong}</div><div className="text-[10px] text-slate-500">Yanlış</div></div>
          <div className="card text-center py-3"><div className="text-2xl font-bold text-slate-500">{result.empty}</div><div className="text-[10px] text-slate-500">Boş</div></div>
        </div>
        {result.wrong > 0 && (
          <div className="card mb-4 bg-warning/5 border-warning/20 flex items-center gap-3">
            <div className="text-xl">📕</div>
            <div className="flex-1"><div className="text-sm font-medium text-warning">{result.wrong} yanlış deftere eklendi</div></div>
            <Link href="/yanlislarim" className="text-xs text-primary-light">Git →</Link>
          </div>
        )}
        {/* Cevap inceleme */}
        <details className="card mb-4">
          <summary className="text-sm font-medium cursor-pointer">📋 Cevapları İncele</summary>
          <div className="space-y-3 mt-3 max-h-96 overflow-y-auto">
            {questions.map((q, i) => {
              const ua = answers[i];
              const ok = ua === q.correct_answer;
              return (
                <div key={i} className="bg-[#0F172A] rounded-xl p-3 border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1.5">
                    {ok ? <CheckCircle size={14} className="text-success"/> : ua ? <XCircle size={14} className="text-red-400"/> : <Clock size={14} className="text-slate-500"/>}
                    <span className="text-[10px] text-slate-500">Soru {i+1}</span>
                  </div>
                  <p className="text-xs font-medium mb-2">{q.text}</p>
                  <div className="text-[11px] text-success">✓ Doğru: {q.correct_answer}</div>
                  {ua && !ok && <div className="text-[11px] text-red-400">✗ Senin: {ua}</div>}
                  {q.explanation && <div className="text-[10px] text-slate-500 mt-1.5 bg-white/[0.02] rounded p-1.5">💡 {q.explanation}</div>}
                </div>
              );
            })}
          </div>
        </details>
        <div className="flex gap-3">
          <Link href="/pdf" className="flex-1 text-center py-3 rounded-xl bg-[#253347] text-slate-300 font-medium">+ Yeni Soru Üret</Link>
          <button onClick={() => { setAnswers({}); setCurrent(0); setStartTime(Date.now()); setElapsed(0); setPhase('quiz'); }} className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-1.5"><RotateCcw size={15}/> Tekrar Çöz</button>
        </div>
      </div>
    );
  }

  // QUIZ
  const q = questions[current];
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">Soru <strong className="text-white">{current+1}</strong>/{questions.length}</span>
        <div className="flex items-center gap-2 text-sm font-mono font-bold text-primary-light px-3 py-1.5 rounded-lg bg-primary/10"><Clock size={14}/> {fmt(elapsed)}</div>
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
            const sel = answers[current] === letter;
            return (
              <button key={i} onClick={() => setAnswers(p => ({...p, [current]: letter}))}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${sel ? 'border-primary bg-primary/10' : 'border-white/[0.08] hover:border-primary/40 hover:bg-primary/5'}`}>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${sel ? 'border-primary text-primary-light bg-primary/20' : 'border-white/20 text-slate-500'}`}>{letter}</div>
                <span className="text-sm">{opt.replace(/^[A-E]\)\s*/, '')}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {questions.map((qq, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-all ${i === current ? 'bg-primary text-white' : answers[i] ? 'bg-success/20 text-success' : 'bg-[#253347] text-slate-500'}`}>{i+1}</button>
        ))}
      </div>
      <div className="flex justify-between gap-3">
        <button onClick={() => setCurrent(p => Math.max(0, p-1))} disabled={current===0} className="btn-secondary disabled:opacity-30">← Önceki</button>
        {current < questions.length-1
          ? <button onClick={() => setCurrent(p => p+1)} className="btn-primary">Sonraki →</button>
          : <button onClick={submit} className="btn-primary">✓ Bitir & Sonuç</button>
        }
      </div>
    </div>
  );
}
