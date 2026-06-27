'use client';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trash2, Zap, CreditCard, FileText, Loader, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

type Tab = 'topic' | 'paste' | 'pdf';
const LETTERS = ['A','B','C','D','E'];

export default function PdfPage() {
  const [tab, setTab] = useState<Tab>('topic');
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [topic, setTopic] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');

  // Çözülebilir quiz state
  const [quiz, setQuiz] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [revealed, setRevealed] = useState(false);
  const [quizSource, setQuizSource] = useState('');

  const load = () => api.get('/pdfs').then(r => setPdfs(r.data));
  useEffect(() => { load(); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} 15MB'dan büyük. "Metin Yapıştır" kullan.`);
        continue;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        await api.post('/pdfs', form);
        toast.success(`${file.name} yüklendi!`);
        load();
      } catch (e: any) { toast.error(e.response?.data?.error || 'Yükleme başarısız'); }
      finally { setUploading(false); }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 15 * 1024 * 1024,
  });

  const startGenerate = async (body: any, sourceName: string) => {
    setGenerating(true);
    setQuiz([]); setAnswers({}); setRevealed(false);
    try {
      const { data } = await api.post('/ai/generate-questions', { ...body, count, difficulty });
      if (!data.questions?.length) { toast.error('Soru üretilemedi, tekrar dene'); return; }
      setQuiz(data.questions);
      setQuizSource(sourceName);
      toast.success(`${data.count} soru hazır! Şimdi çöz 👇`);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Hata, tekrar dene');
    } finally { setGenerating(false); }
  };

  const genFlashcards = async (body: any) => {
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/generate-flashcards', { ...body, count: 15 });
      toast.success(`${data.count} flashcard oluşturuldu! Flashcard sayfasında.`);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Hata'); }
    finally { setGenerating(false); }
  };

  const deletePdf = async (id: number) => {
    if (!confirm('Sil?')) return;
    await api.delete(`/pdfs/${id}`);
    toast.success('Silindi'); load();
  };

  // Quiz çözüm
  const score = () => {
    let c=0,w=0,e=0;
    quiz.forEach((q,i) => { if(!answers[i])e++; else if(answers[i]===q.correct_answer)c++; else w++; });
    return { c, w, e, net: Math.round((c-w*0.25)*10)/10 };
  };

  const submitQuiz = async () => {
    setRevealed(true);
    // Yanlışları deftere kaydet
    const wrongs = quiz.filter((q,i) => answers[i] && answers[i] !== q.correct_answer)
      .map((q,i) => ({ text:q.text, options:q.options, correct_answer:q.correct_answer, explanation:q.explanation, user_answer:answers[quiz.indexOf(q)], subject:q.subject }));
    if (wrongs.length) api.post('/study/wrong', { questions: wrongs }).catch(()=>{});
    api.post('/study/daily/increment', { type:'questions', amount:quiz.length }).catch(()=>{});
    // XP
    const s = score();
    api.post('/quiz/submit', { answers: quiz.map((q,i)=>({ questionId:q.id, selected:answers[i]||'' })) }).catch(()=>{});
  };

  // EĞER QUIZ AKTIFSE: çözme ekranı göster
  if (quiz.length > 0) {
    const s = revealed ? score() : null;
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold">📝 {quizSource}</h1>
            <p className="text-xs text-slate-500">{quiz.length} soru · {revealed ? 'Sonuçlar' : 'Çöz ve kontrol et'}</p>
          </div>
          <button onClick={() => { setQuiz([]); setAnswers({}); setRevealed(false); }} className="text-xs text-slate-500 hover:text-white">✕ Kapat</button>
        </div>

        {/* Sonuç özeti */}
        {revealed && s && (
          <div className="card mb-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><div className="text-2xl font-black text-primary-light">{s.net}</div><div className="text-[10px] text-slate-500">NET</div></div>
              <div><div className="text-2xl font-black text-success">{s.c}</div><div className="text-[10px] text-slate-500">Doğru</div></div>
              <div><div className="text-2xl font-black text-red-400">{s.w}</div><div className="text-[10px] text-slate-500">Yanlış</div></div>
              <div><div className="text-2xl font-black text-slate-500">{s.e}</div><div className="text-[10px] text-slate-500">Boş</div></div>
            </div>
          </div>
        )}

        {/* Sorular */}
        <div className="space-y-3">
          {quiz.map((q, qi) => (
            <div key={qi} className="card">
              <div className="text-[11px] text-slate-500 mb-1.5">Soru {qi+1}</div>
              <p className="text-sm font-medium leading-relaxed mb-3">{q.text}</p>
              <div className="space-y-1.5">
                {(q.options as string[]).map((opt, oi) => {
                  const L = LETTERS[oi];
                  const sel = answers[qi] === L;
                  const correct = q.correct_answer === L;
                  let cls = 'bg-[#0F172A] text-slate-400 hover:bg-[#253347]';
                  if (revealed) {
                    if (correct) cls = 'bg-success/15 text-success border border-success/30';
                    else if (sel) cls = 'bg-red-500/15 text-red-400 border border-red-500/30';
                  } else if (sel) cls = 'bg-primary/15 text-primary-light border border-primary/30';
                  return (
                    <button key={oi} onClick={() => !revealed && setAnswers(p => ({...p, [qi]: L}))}
                      className={`w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-left transition-all ${cls}`}>
                      <span className="font-bold flex-shrink-0">{L})</span>
                      <span className="flex-1">{opt.replace(/^[A-E]\)\s*/, '')}</span>
                      {revealed && correct && <CheckCircle size={14} className="flex-shrink-0" />}
                      {revealed && sel && !correct && <XCircle size={14} className="flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {revealed && q.explanation && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-white/[0.03] text-[11px] text-slate-400 leading-relaxed">
                  💡 {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Alt buton */}
        <div className="sticky bottom-4 mt-4">
          {!revealed ? (
            <button onClick={submitQuiz} className="w-full py-3 rounded-xl bg-primary hover:bg-primary-light text-white font-semibold transition-colors shadow-lg">
              Cevapları Kontrol Et ({Object.keys(answers).length}/{quiz.length} işaretlendi)
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setQuiz([]); setAnswers({}); setRevealed(false); }} className="flex-1 py-3 rounded-xl bg-[#253347] text-slate-300 font-medium">← Yeni Soru Üret</button>
              <button onClick={() => { setAnswers({}); setRevealed(false); window.scrollTo(0,0); }} className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-1.5"><RotateCcw size={15} /> Tekrar Çöz</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // NORMAL EKRAN: soru üretme
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-lg md:text-xl font-bold mb-1">⚡ Soru Üret & Çöz</h1>
      <p className="text-xs text-slate-500 mb-5">Konu yaz, metin yapıştır veya PDF yükle — AI soru üretir, hemen çözersin</p>

      {/* Ayarlar */}
      <div className="flex flex-wrap gap-4 mb-5">
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Soru Sayısı</div>
          <div className="flex gap-1">
            {[5,10,20].map(n => (
              <button key={n} onClick={() => setCount(n)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${count===n?'bg-primary text-white':'bg-[#253347] text-slate-400'}`}>{n}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Zorluk</div>
          <div className="flex gap-1">
            {[{v:'easy',l:'Kolay'},{v:'medium',l:'Orta'},{v:'hard',l:'Zor'}].map(d => (
              <button key={d.v} onClick={() => setDifficulty(d.v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${difficulty===d.v?'bg-primary text-white':'bg-[#253347] text-slate-400'}`}>{d.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#0F172A] p-1 rounded-xl">
        {[{id:'topic',l:'✏️ Konu Yaz',d:'En kolay'},{id:'paste',l:'📋 Metin Yapıştır',d:'Büyük PDF için'},{id:'pdf',l:'📄 PDF Yükle',d:'Max 15MB'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)} className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${tab===t.id?'bg-[#1E293B] text-white':'text-slate-500'}`}>
            <div>{t.l}</div><div className={`text-[9px] mt-0.5 ${tab===t.id?'text-primary-light':'text-slate-600'}`}>{t.d}</div>
          </button>
        ))}
      </div>

      {/* Konu yaz */}
      {tab === 'topic' && (
        <div className="card space-y-3">
          <div className="text-sm font-medium">Hangi konudan soru üretelim?</div>
          <div className="flex flex-wrap gap-2">
            {["Türkiye'nin İklimi","Osmanlı Kuruluşu","1982 Anayasası","Türkiye'nin Nüfusu","Sözcük Türleri","Kesirler"].map(t => (
              <button key={t} onClick={() => setTopic(t)} className="px-2.5 py-1 rounded-lg text-[11px] bg-[#253347] text-slate-400 hover:text-white hover:bg-primary/20 transition-all">{t}</button>
            ))}
          </div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="örn: Türkiye'nin coğrafi bölgeleri" className="input" onKeyDown={e => e.key === 'Enter' && topic.trim() && startGenerate({ topic }, topic)} />
          <div className="flex gap-2">
            <button onClick={() => topic.trim() ? startGenerate({ topic }, topic) : toast.error('Konu yaz')} disabled={generating} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium disabled:opacity-50">
              {generating ? <><Loader size={14} className="animate-spin" /> Üretiliyor...</> : <><Zap size={14} /> Soru Üret & Çöz</>}
            </button>
            <button onClick={() => topic.trim() ? genFlashcards({ topic }) : toast.error('Konu yaz')} disabled={generating} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/20 text-purple-300 text-sm font-medium disabled:opacity-50">
              <CreditCard size={14} /> Flashcard
            </button>
          </div>
        </div>
      )}

      {/* Metin yapıştır */}
      {tab === 'paste' && (
        <div className="card space-y-3">
          <div className="text-sm font-medium">PDF'den bölüm kopyala-yapıştır</div>
          <p className="text-xs text-slate-500">300MB PDF'in istediğin sayfasını seç → kopyala → buraya yapıştır</p>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Metni yapıştır..." rows={8} className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary resize-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{pasteText.length} karakter</span>
            <div className="flex gap-2">
              <button onClick={() => pasteText.trim().length>=100 ? startGenerate({ text: pasteText }, 'Yapıştırılan Metin') : toast.error('En az 100 karakter')} disabled={generating} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium disabled:opacity-50">
                {generating ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />} Soru Üret
              </button>
              <button onClick={() => pasteText.trim().length>=100 ? genFlashcards({ text: pasteText }) : toast.error('En az 100 karakter')} disabled={generating} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 text-purple-300 text-sm font-medium disabled:opacity-50">
                <CreditCard size={14} /> Kart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF yükle */}
      {tab === 'pdf' && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs">⚠️ Max 15MB. Büyük PDF'ler için "Metin Yapıştır" kullan.</div>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragActive?'border-primary bg-primary/5':'border-white/10 hover:border-primary/50'}`}>
            <input {...getInputProps()} />
            {uploading ? <div className="flex flex-col items-center gap-2"><Loader size={28} className="animate-spin text-primary" /><span className="text-sm text-slate-400">Yükleniyor...</span></div>
              : <><div className="text-3xl mb-2">📤</div><p className="text-sm font-medium">{isDragActive?'Bırak!':'PDF sürükle veya tıkla'}</p></>}
          </div>
          <div className="space-y-2">
            {pdfs.map(pdf => (
              <div key={pdf.id} className="card flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-red-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{pdf.title}</div>
                  <div className="text-xs text-slate-500">{pdf.question_count} soru · {pdf.flashcard_count} kart</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startGenerate({ pdfId: pdf.id }, pdf.title)} disabled={generating} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/15 text-primary-light text-xs disabled:opacity-50"><Zap size={10} /> Soru</button>
                  <button onClick={() => genFlashcards({ pdfId: pdf.id })} disabled={generating} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary/15 text-purple-300 text-xs disabled:opacity-50"><CreditCard size={10} /> Kart</button>
                  <button onClick={() => deletePdf(pdf.id)} className="px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs"><Trash2 size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
