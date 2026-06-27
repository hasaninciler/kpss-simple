'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Zap, CreditCard, BookOpen, Send, ChevronDown, ChevronUp, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const PLAYLISTS = [
  { id: 'PLPlLdubQ1fMsIk3Kujy9yqJOyFLHsfQlp', title: 'Coğrafya',    icon: '🗺️', color: '#3B82F6' },
  { id: 'PL5w_hbb3voMm6DLBYyv0VZs9sKidbEpcg', title: 'Tarih',       icon: '🏛️', color: '#F59E0B' },
  { id: 'PLPhEmM6X--Wf4b-wPQNtUqCIgomDotaIU', title: 'Matematik',   icon: '📐', color: '#22C55E' },
  { id: 'PLPlLdubQ1fMs-O0_vwxL7bH-S7Bi4jKsu', title: 'Türkçe',      icon: '📝', color: '#A855F7' },
  { id: 'PL5w_hbb3voMmmxQhHqC_bmvVtzlDpXfA1', title: 'Vatandaşlık', icon: '⚖️', color: '#EF4444' },
];

// AI Panel - videonun yanında çalışan AI
function AiPanel({ videoTitle, playlistTitle }: { videoTitle: string; playlistTitle: string }) {
  const [tab, setTab] = useState<'chat'|'quiz'|'summary'>('chat');
  const [messages, setMessages] = useState<{role:string;content:string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number,string>>({});
  const [revealed, setRevealed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Video değişince AI'yı sıfırla
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `"${videoTitle}" videosunu izliyorsun 🎬\n\nBu konuda soru sorabilir, soru üretebilir veya özet isteyebilirsin.`
    }]);
    setQuestions([]);
    setSummary('');
    setSelectedAnswers({});
    setRevealed(false);
  }, [videoTitle]);

  const sendChat = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Video: "${videoTitle}" (${playlistTitle} konusu)\n\nSoru: ${msg}`
      });
      setMessages(p => [...p, { role: 'assistant', content: data.reply }]);
    } catch { toast.error('Hata'); }
    finally { setLoading(false); }
  };

  const generateQuiz = async (count: number, diff: string) => {
    setGenLoading(true);
    setQuestions([]);
    setSelectedAnswers({});
    setRevealed(false);
    try {
      const { data } = await api.post('/ai/generate-questions', {
        topic: `${videoTitle} - ${playlistTitle}`,
        count,
        difficulty: diff,
      });
      setQuestions(data.questions);
      toast.success(`${data.count} soru hazır!`);
    } catch { toast.error('Hata'); }
    finally { setGenLoading(false); }
  };

  const generateSummary = async () => {
    setGenLoading(true);
    try {
      const { data } = await api.post('/ai/chat', {
        message: `"${videoTitle}" konusunu KPSS açısından özetle. Madde madde, ezber dostu yaz.`
      });
      setSummary(data.reply);
    } catch { toast.error('Hata'); }
    finally { setGenLoading(false); }
  };

  const generateFlashcards = async () => {
    setGenLoading(true);
    try {
      const { data } = await api.post('/ai/generate-flashcards', {
        topic: `${videoTitle} - ${playlistTitle}`,
        count: 10,
      });
      toast.success(`${data.count} flashcard oluşturuldu! Flashcard sayfasında görebilirsin.`);
    } catch { toast.error('Hata'); }
    finally { setGenLoading(false); }
  };

  // Quiz hesapla
  const calcScore = () => {
    let c = 0, w = 0;
    questions.forEach((q, i) => {
      if (!selectedAnswers[i]) return;
      if (selectedAnswers[i] === q.correct_answer) c++;
      else w++;
    });
    return { correct: c, wrong: w, net: Math.round((c - w * 0.25) * 10) / 10 };
  };

  const LETTERS = ['A','B','C','D','E'];

  return (
    <div className="flex flex-col h-full bg-[#1E293B] border-l border-white/[0.08]">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] flex-shrink-0">
        {[
          { id: 'chat', label: '💬 AI Sohbet' },
          { id: 'quiz', label: '⚡ Soru Üret' },
          { id: 'summary', label: '📋 Özet' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-all ${tab === t.id ? 'border-b-2 border-primary text-primary-light' : 'text-slate-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat tab */}
      {tab === 'chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 ${m.role === 'assistant' ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-[#253347]'}`}>
                  {m.role === 'assistant' ? '🎓' : '👤'}
                </div>
                <div className={`text-xs leading-relaxed px-3 py-2 rounded-xl whitespace-pre-wrap max-w-[85%] ${m.role === 'assistant' ? 'bg-[#0F172A] border border-white/[0.06]' : 'bg-primary text-white'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px]">🎓</div>
                <div className="px-3 py-2 rounded-xl bg-[#0F172A] border border-white/[0.06] flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 pt-2 flex flex-wrap gap-1.5">
            {[
              'Bu konuyu anlat',
              'KPSS sorusu üret',
              'Ezber tekniği ver',
              'Önemli noktalar',
            ].map(s => (
              <button key={s} onClick={() => sendChat(s)}
                className="text-[10px] px-2 py-1 rounded-full bg-[#0F172A] border border-white/[0.08] text-slate-500 hover:text-white hover:border-primary/40 transition-all">
                {s}
              </button>
            ))}
          </div>

          <div className="p-3 flex gap-2 flex-shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Video hakkında sor..."
              className="flex-1 bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-primary transition-colors"
            />
            <button onClick={() => sendChat()} disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-light disabled:opacity-40 text-white transition-colors">
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Quiz tab */}
      {tab === 'quiz' && (
        <div className="flex-1 overflow-y-auto p-3">
          {questions.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-white">"{videoTitle}"</strong> konusundan KPSS tarzı sorular üret.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '5 Kolay Soru', count: 5, diff: 'easy', color: 'bg-success/10 text-success border-success/20' },
                  { label: '10 Orta Soru', count: 10, diff: 'medium', color: 'bg-primary/10 text-primary-light border-primary/20' },
                  { label: '5 Zor Soru', count: 5, diff: 'hard', color: 'bg-warning/10 text-warning border-warning/20' },
                  { label: '10 Karma', count: 10, diff: 'medium', color: 'bg-secondary/10 text-purple-300 border-secondary/20' },
                ].map(b => (
                  <button key={b.label} onClick={() => generateQuiz(b.count, b.diff)} disabled={genLoading}
                    className={`py-3 px-3 rounded-xl border text-xs font-medium transition-all disabled:opacity-50 ${b.color}`}>
                    {genLoading ? '⏳' : <Zap size={12} className="inline mr-1" />}
                    {b.label}
                  </button>
                ))}
              </div>
              <button onClick={generateFlashcards} disabled={genLoading}
                className="w-full py-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-purple-300 text-xs font-medium transition-all disabled:opacity-50">
                <CreditCard size={12} className="inline mr-1" /> 10 Flashcard Üret
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Skor */}
              {revealed && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400">Sonuç</div>
                    <div className="text-lg font-black text-primary-light">Net: {calcScore().net}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-success">✅ {calcScore().correct} doğru</div>
                    <div className="text-red-400">❌ {calcScore().wrong} yanlış</div>
                  </div>
                </div>
              )}

              {questions.map((q, qi) => (
                <div key={qi} className="bg-[#0F172A] rounded-xl p-3 border border-white/[0.06]">
                  <div className="text-[10px] text-slate-500 mb-1">Soru {qi+1}</div>
                  <p className="text-xs font-medium leading-relaxed mb-2">{q.text}</p>
                  <div className="space-y-1">
                    {(q.options as string[]).map((opt, oi) => {
                      const letter = LETTERS[oi];
                      const selected = selectedAnswers[qi] === letter;
                      const correct = q.correct_answer === letter;
                      let cls = 'bg-[#1E293B] text-slate-400';
                      if (revealed) {
                        if (correct) cls = 'bg-success/15 text-success border border-success/30';
                        else if (selected && !correct) cls = 'bg-red-500/15 text-red-400 border border-red-500/30';
                      } else if (selected) {
                        cls = 'bg-primary/15 text-primary-light border border-primary/30';
                      }
                      return (
                        <button key={oi} onClick={() => !revealed && setSelectedAnswers(p => ({...p,[qi]:letter}))}
                          className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-[11px] text-left transition-all ${cls}`}>
                          <span className="font-bold flex-shrink-0">{letter})</span>
                          <span>{opt.replace(/^[A-E]\)\s*/,'')}</span>
                          {revealed && correct && <CheckCircle size={12} className="ml-auto flex-shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                  {revealed && q.explanation && (
                    <div className="mt-2 p-2 rounded-lg bg-white/[0.03] text-[10px] text-slate-400 leading-relaxed">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-2 pb-2">
                {!revealed
                  ? <button onClick={() => setRevealed(true)} className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-medium">Sonuçları Gör</button>
                  : <button onClick={() => { setQuestions([]); setRevealed(false); setSelectedAnswers({}); }} className="flex-1 py-2 rounded-xl bg-[#253347] text-slate-300 text-xs">Yeni Soru Üret</button>
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="flex-1 overflow-y-auto p-3">
          {!summary ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                <strong className="text-white">"{videoTitle}"</strong> konusunun KPSS özeti ve önemli noktaları.
              </p>
              <button onClick={generateSummary} disabled={genLoading}
                className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-xs font-medium transition-all disabled:opacity-50">
                {genLoading ? '⏳ Özet hazırlanıyor...' : '📋 AI Özet Oluştur'}
              </button>
              <button onClick={generateFlashcards} disabled={genLoading}
                className="w-full py-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-purple-300 text-xs font-medium">
                <CreditCard size={12} className="inline mr-1" /> Flashcard Oluştur
              </button>

              {/* Video notları */}
              <VideoNotes videoId={videoTitle} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#0F172A] rounded-xl p-3 border border-white/[0.06]">
                <div className="text-[10px] text-primary-light font-semibold mb-2">📋 KPSS ÖZETİ</div>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{summary}</div>
              </div>
              <button onClick={generateFlashcards} disabled={genLoading}
                className="w-full py-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-purple-300 text-xs font-medium">
                <CreditCard size={12} className="inline mr-1" /> Flashcard Oluştur
              </button>
              <button onClick={() => setSummary('')}
                className="w-full py-2 rounded-xl bg-[#253347] text-slate-400 text-xs">
                Yenile
              </button>
              <VideoNotes videoId={videoTitle} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Video bazlı not
function VideoNotes({ videoId }: { videoId: string }) {
  const key = `note_${videoId}`;
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    setNote(localStorage.getItem(key) || '');
  }, [key]);

  const handleChange = (v: string) => {
    setNote(v);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      localStorage.setItem(key, v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  return (
    <div className="bg-[#0F172A] rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <div className="text-[10px] text-slate-500">📝 Video Notum</div>
        {saved && <div className="text-[10px] text-success">✓ Kaydedildi</div>}
      </div>
      <textarea value={note} onChange={e => handleChange(e.target.value)}
        placeholder="Bu video için not al..."
        rows={4}
        className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none resize-none"
      />
    </div>
  );
}

// Video arama paneli
function VideoList({ videos, activeVideo, setActiveVideo, color }: any) {
  const [search, setSearch] = useState('');
  const filtered = search ? videos.filter((v: any) => v.title.toLowerCase().includes(search.toLowerCase())) : videos;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 flex-shrink-0">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Video ara..."
          className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-primary transition-colors"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 pt-0">
        {filtered.map((v: any, i: number) => {
          const active = activeVideo?.id === v.id;
          const realIdx = videos.findIndex((x: any) => x.id === v.id);
          const hasNote = !!localStorage.getItem(`note_${v.title}`);
          return (
            <button key={v.id} onClick={() => setActiveVideo(v)}
              className={`w-full flex items-start gap-2 p-2 rounded-xl text-left transition-all mb-1 ${active ? 'border' : 'hover:bg-[#253347]'}`}
              style={active ? { background: color+'18', borderColor: color+'40' } : {}}>
              <div className="relative flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden bg-[#253347]">
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">{realIdx+1}</div>
                }
                {active && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{background:color+'90'}}>
                    <span className="text-white text-xs font-bold">▶</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium leading-snug line-clamp-2">{v.title}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-slate-600">#{realIdx+1}</span>
                  {hasNote && <span className="text-[10px]">📝</span>}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-6 text-slate-600 text-xs">Bulunamadı</div>}
      </div>
    </div>
  );
}

// Ana sayfa
export default function VideoPage() {
  const [activePl, setActivePl]       = useState(PLAYLISTS[0]);
  const [videos, setVideos]           = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showAi, setShowAi]           = useState(true);
  const [watched, setWatched]         = useState<Set<string>>(new Set());

  useEffect(() => {
    const w = localStorage.getItem('kpss_watched');
    if (w) setWatched(new Set(JSON.parse(w)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setVideos([]); setActiveVideo(null);
    api.get(`/youtube/playlist/${activePl.id}`)
      .then(r => {
        if (cancelled) return;
        setVideos(r.data.videos);
        setActiveVideo(r.data.videos[0] ?? null);
      })
      .catch(e => { if (!cancelled) setError(e.response?.data?.error || 'Yüklenemedi'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activePl.id]);

  const markWatched = (videoId: string) => {
    const updated = new Set(watched).add(videoId);
    setWatched(updated);
    localStorage.setItem('kpss_watched', JSON.stringify([...updated]));
  };

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-screen overflow-hidden">

      {/* Sol: Ders seçici */}
      <div className="hidden md:flex w-36 border-r border-white/[0.08] flex-col flex-shrink-0">
        <div className="p-2 border-b border-white/[0.08]">
          <div className="text-[9px] text-slate-600 uppercase tracking-wide px-1">Dersler</div>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {PLAYLISTS.map(pl => (
            <button key={pl.id} onClick={() => pl.id !== activePl.id && setActivePl(pl)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${activePl.id === pl.id ? 'text-white' : 'text-slate-500 hover:bg-[#253347] hover:text-white'}`}
              style={activePl.id === pl.id ? {background:pl.color+'20', border:`1px solid ${pl.color}35`} : {}}>
              <span className="text-sm">{pl.icon}</span>
              <span className="text-[11px] font-medium truncate">{pl.title}</span>
            </button>
          ))}
        </div>
        {/* İlerleme */}
        <div className="p-2 border-t border-white/[0.08]">
          <div className="text-[9px] text-slate-600 mb-1">İzlenen</div>
          <div className="text-xs font-bold" style={{color:activePl.color}}>
            {videos.filter(v => watched.has(v.id)).length} / {videos.length}
          </div>
          {videos.length > 0 && (
            <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{width:`${(videos.filter(v=>watched.has(v.id)).length/videos.length)*100}%`, background:activePl.color}} />
            </div>
          )}
        </div>
      </div>

      {/* Orta: Player */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Player */}
        <div className="flex-shrink-0 p-3">
          <div className="rounded-xl overflow-hidden bg-black w-full" style={{aspectRatio:'16/9'}}>
            {activeVideo ? (
              <iframe key={activeVideo.id}
                src={`https://www.youtube.com/embed/${activeVideo.id}?rel=0&modestbranding=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen className="w-full h-full"
                onLoad={() => activeVideo && markWatched(activeVideo.id)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {loading
                  ? <div className="text-center"><div className="text-3xl animate-pulse mb-2">🎬</div><div className="text-xs text-slate-500">Yükleniyor...</div></div>
                  : <div className="text-slate-600 text-sm">Bir video seç</div>
                }
              </div>
            )}
          </div>
        </div>

        {/* Video info + kontroller */}
        {activeVideo && (
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold leading-snug line-clamp-1">{activeVideo.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">{activePl.icon} {activePl.title}</span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] text-slate-500">#{videos.findIndex(v=>v.id===activeVideo.id)+1}/{videos.length}</span>
                  {watched.has(activeVideo.id) && <span className="text-[10px] text-success">✓ İzlendi</span>}
                </div>
              </div>
              <button onClick={() => setShowAi(s => !s)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex-shrink-0 ${showAi ? 'bg-primary/20 text-primary-light' : 'bg-[#253347] text-slate-400'}`}>
                🤖 AI {showAi ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
              </button>
            </div>

            {/* Prev/Next */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { const i=videos.findIndex(v=>v.id===activeVideo.id); if(i>0) setActiveVideo(videos[i-1]); }}
                disabled={videos.findIndex(v=>v.id===activeVideo.id)===0}
                className="flex-1 py-1.5 rounded-lg bg-[#253347] text-slate-400 text-[11px] hover:text-white disabled:opacity-30 transition-colors">
                ← Önceki
              </button>
              <button
                onClick={() => { const i=videos.findIndex(v=>v.id===activeVideo.id); if(i<videos.length-1) setActiveVideo(videos[i+1]); }}
                disabled={videos.findIndex(v=>v.id===activeVideo.id)===videos.length-1}
                className="flex-1 py-1.5 rounded-lg bg-[#253347] text-slate-400 text-[11px] hover:text-white disabled:opacity-30 transition-colors">
                Sonraki →
              </button>
            </div>
          </div>
        )}

        {error && <div className="mx-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">⚠️ {error}</div>}

        {/* Video listesi (mobile + masaüstü küçük ekran) */}
        <div className={`flex-1 overflow-hidden border-t border-white/[0.08] ${showAi ? 'hidden md:hidden' : 'flex flex-col'}`}>
          {loading ? (
            <div className="p-3 space-y-2">
              {[1,2,3].map(i => <div key={i} className="flex gap-2 animate-pulse"><div className="w-16 h-10 rounded bg-[#253347]"/><div className="flex-1 space-y-2"><div className="h-2.5 bg-[#253347] rounded w-full"/><div className="h-2 bg-[#253347] rounded w-2/3"/></div></div>)}
            </div>
          ) : (
            <VideoList videos={videos} activeVideo={activeVideo} setActiveVideo={setActiveVideo} color={activePl.color} />
          )}
        </div>
      </div>

      {/* Sağ: Video listesi (masaüstü) */}
      {!showAi && (
        <div className="hidden md:flex w-60 border-l border-white/[0.08] flex-col flex-shrink-0">
          <div className="p-3 border-b flex-shrink-0" style={{borderColor:activePl.color+'30'}}>
            <div className="flex items-center gap-2">
              <span>{activePl.icon}</span>
              <div>
                <div className="text-xs font-semibold">{activePl.title}</div>
                <div className="text-[10px] text-slate-500">{loading ? 'Yükleniyor...' : `${videos.length} video`}</div>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-3 space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="flex gap-2 animate-pulse"><div className="w-16 h-10 rounded bg-[#253347]"/><div className="flex-1 space-y-2"><div className="h-2.5 bg-[#253347] rounded"/><div className="h-2 bg-[#253347] rounded w-2/3"/></div></div>)}
            </div>
          ) : (
            <VideoList videos={videos} activeVideo={activeVideo} setActiveVideo={setActiveVideo} color={activePl.color} />
          )}
        </div>
      )}

      {/* AI Panel (masaüstü) */}
      {showAi && activeVideo && (
        <div className="hidden md:flex w-72 flex-col flex-shrink-0">
          <AiPanel videoTitle={activeVideo.title} playlistTitle={activePl.title} />
        </div>
      )}
    </div>
  );
}
