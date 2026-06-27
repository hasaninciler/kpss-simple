'use client';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trash2, Zap, CreditCard, FileText, Loader, BookOpen, PenLine } from 'lucide-react';

type Tab = 'pdf' | 'topic' | 'paste';

export default function PdfPage() {
  const [tab, setTab] = useState<Tab>('topic');
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  // Topic/paste form
  const [topic, setTopic] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [genResult, setGenResult] = useState<any>(null);

  const load = () => api.get('/pdfs').then(r => setPdfs(r.data));
  useEffect(() => { load(); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} 15MB'dan büyük. Metni kopyalayıp "Metin Yapıştır" sekmesini kullan.`);
        continue;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        await api.post('/pdfs', form);
        toast.success(`${file.name} yüklendi!`);
        load();
      } catch (e: any) {
        toast.error(e.response?.data?.error || 'Yükleme başarısız');
      } finally { setUploading(false); }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 15 * 1024 * 1024,
  });

  const generateFromTopic = async () => {
    if (!topic.trim()) { toast.error('Konu yaz'); return; }
    setGenerating('topic');
    setGenResult(null);
    try {
      const { data } = await api.post('/ai/generate-questions', { topic, count, difficulty });
      setGenResult(data);
      toast.success(`${data.count} soru üretildi!`);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Hata'); }
    finally { setGenerating(null); }
  };

  const generateFromPaste = async () => {
    if (pasteText.trim().length < 100) { toast.error('En az 100 karakter metin gir'); return; }
    setGenerating('paste');
    setGenResult(null);
    try {
      const { data } = await api.post('/ai/generate-questions', { text: pasteText, count, difficulty });
      setGenResult(data);
      toast.success(`${data.count} soru üretildi!`);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Hata'); }
    finally { setGenerating(null); }
  };

  const generateFromPdf = async (pdf: any) => {
    setGenerating(pdf.id);
    setGenResult(null);
    try {
      const { data } = await api.post('/ai/generate-questions', { pdfId: pdf.id, count, difficulty });
      setGenResult(data);
      toast.success(`${data.count} soru üretildi!`);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Hata'); }
    finally { setGenerating(null); load(); }
  };

  const generateFlashcards = async (source: any) => {
    setGenerating('fc_' + (source.id || 'new'));
    try {
      const body = source.id ? { pdfId: source.id, count: 15 }
        : source.topic ? { topic: source.topic, count: 15 }
        : { text: source.text, count: 15 };
      const { data } = await api.post('/ai/generate-flashcards', body);
      toast.success(`${data.count} flashcard üretildi!`);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Hata'); }
    finally { setGenerating(null); }
  };

  const deletePdf = async (id: number) => {
    if (!confirm('Sil?')) return;
    await api.delete(`/pdfs/${id}`);
    toast.success('Silindi');
    load();
  };

  const tabs = [
    { id: 'topic', label: '✏️ Konu Yaz', desc: 'En kolay yol' },
    { id: 'paste', label: '📋 Metin Yapıştır', desc: 'PDF\'den kopyala' },
    { id: 'pdf', label: '📄 PDF Yükle', desc: 'Max 15MB' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <h1 className="text-lg md:text-xl font-bold mb-1">⚡ Soru & Flashcard Üret</h1>
      <p className="text-xs text-slate-500 mb-5">Konu yaz, metin yapıştır veya PDF yükle — AI anında soru üretir</p>

      {/* Ayarlar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Soru Sayısı</div>
          <div className="flex gap-1">
            {[5, 10, 20].map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${count === n ? 'bg-primary text-white' : 'bg-[#253347] text-slate-400 hover:text-white'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Zorluk</div>
          <div className="flex gap-1">
            {[{v:'easy',l:'Kolay'},{v:'medium',l:'Orta'},{v:'hard',l:'Zor'}].map(d => (
              <button key={d.v} onClick={() => setDifficulty(d.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${difficulty === d.v ? 'bg-primary text-white' : 'bg-[#253347] text-slate-400 hover:text-white'}`}>
                {d.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#0F172A] p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-[#1E293B] text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <div>{t.label}</div>
            <div className={`text-[10px] mt-0.5 ${tab === t.id ? 'text-primary-light' : 'text-slate-600'}`}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab içerikleri */}
      {tab === 'topic' && (
        <div className="card space-y-3 mb-5">
          <div className="text-sm font-medium">Hangi konudan soru üretelim?</div>
          <div className="flex flex-wrap gap-2 mb-1">
            {['Türkiye\'nin İklimi','Osmanlı\'nın Kuruluşu','1982 Anayasası','Türkiye\'nin Nüfusu','Sözcük Türleri','Kesirler ve Yüzdeler'].map(t => (
              <button key={t} onClick={() => setTopic(t)}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-[#253347] text-slate-400 hover:text-white hover:bg-primary/20 transition-all">
                {t}
              </button>
            ))}
          </div>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="örn: Türkiye'nin coğrafi bölgeleri, Atatürk ilkeleri..."
            className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary transition-colors"
            onKeyDown={e => e.key === 'Enter' && generateFromTopic()}
          />
          <div className="flex gap-2">
            <button onClick={generateFromTopic} disabled={!!generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-colors disabled:opacity-50">
              {generating === 'topic' ? <><Loader size={14} className="animate-spin" /> Üretiliyor...</> : <><Zap size={14} /> Soru Üret</>}
            </button>
            <button onClick={() => generateFlashcards({ topic })} disabled={!!generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/20 text-purple-300 hover:bg-secondary/30 text-sm font-medium transition-colors disabled:opacity-50">
              <CreditCard size={14} /> Flashcard
            </button>
          </div>
        </div>
      )}

      {tab === 'paste' && (
        <div className="card space-y-3 mb-5">
          <div className="text-sm font-medium">PDF'den istediğin bölümü kopyalayıp yapıştır</div>
          <p className="text-xs text-slate-500">300MB PDF'in istediğin bölümünü seç → Kopyala → buraya yapıştır</p>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Metni buraya yapıştır (Ctrl+V veya Cmd+V)..."
            rows={8}
            className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{pasteText.length} karakter</span>
            <div className="flex gap-2">
              <button onClick={generateFromPaste} disabled={!!generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-colors disabled:opacity-50">
                {generating === 'paste' ? <><Loader size={14} className="animate-spin" /> Üretiliyor...</> : <><Zap size={14} /> Soru Üret</>}
              </button>
              <button onClick={() => generateFlashcards({ text: pasteText })} disabled={!!generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 text-purple-300 text-sm font-medium transition-colors disabled:opacity-50">
                <CreditCard size={14} /> Flashcard
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'pdf' && (
        <div className="mb-5 space-y-3">
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs">
            ⚠️ Maks. 15MB PDF yüklenebilir. Daha büyük PDF'ler için "Metin Yapıştır" sekmesini kullan.
          </div>
          <div {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-primary/50 hover:bg-primary/5'}`}>
            <input {...getInputProps()} />
            {uploading
              ? <div className="flex flex-col items-center gap-2"><Loader size={28} className="animate-spin text-primary" /><span className="text-sm text-slate-400">Yükleniyor...</span></div>
              : <><div className="text-3xl mb-2">📤</div><p className="text-sm font-medium mb-1">{isDragActive ? 'Bırak!' : 'PDF sürükle veya tıkla'}</p><p className="text-xs text-slate-500">Maks. 15MB</p></>
            }
          </div>
          <div className="space-y-2">
            {pdfs.map(pdf => (
              <div key={pdf.id} className="card flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{pdf.title}</div>
                  <div className="text-xs text-slate-500">{pdf.question_count} soru · {pdf.flashcard_count} kart</div>
                  {pdf.ai_summary && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{pdf.ai_summary}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                  <button onClick={() => generateFromPdf(pdf)} disabled={!!generating}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/15 text-primary-light text-xs transition-colors disabled:opacity-50">
                    {generating === pdf.id ? <Loader size={10} className="animate-spin" /> : <Zap size={10} />} Soru
                  </button>
                  <button onClick={() => generateFlashcards(pdf)} disabled={!!generating}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary/15 text-purple-300 text-xs transition-colors disabled:opacity-50">
                    <CreditCard size={10} /> Kart
                  </button>
                  <button onClick={() => deletePdf(pdf.id)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs transition-colors">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Üretilen sorular */}
      {genResult && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">✅ {genResult.count} Soru Üretildi — {genResult.source}</div>
            <button onClick={() => setGenResult(null)} className="text-xs text-slate-500 hover:text-white">Kapat</button>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {genResult.questions.map((q: any, i: number) => (
              <div key={q.id} className="bg-[#0F172A] rounded-xl p-4 border border-white/[0.06]">
                <div className="text-xs text-slate-500 mb-1.5">Soru {i + 1}</div>
                <p className="text-sm font-medium leading-relaxed mb-3">{q.text}</p>
                <div className="space-y-1.5 mb-3">
                  {(q.options as string[]).map((opt, j) => {
                    const letter = ['A','B','C','D','E'][j];
                    const correct = q.correct_answer === letter;
                    return (
                      <div key={j} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${correct ? 'bg-success/10 text-success' : 'text-slate-400'}`}>
                        <span className={`font-bold flex-shrink-0 ${correct ? 'text-success' : ''}`}>{letter})</span>
                        <span>{opt.replace(/^[A-E]\)\s*/, '')}</span>
                        {correct && <span className="ml-auto">✓</span>}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="text-xs text-slate-500 bg-white/[0.03] rounded-lg p-2.5 leading-relaxed">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex gap-2">
            <a href="/quiz" className="flex-1 text-center py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-colors">
              Quiz'e Git →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
