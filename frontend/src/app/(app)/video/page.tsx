'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Send, ChevronLeft, ChevronRight, CheckCircle, List, Bot, Zap, CreditCard, Sparkles, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const PLAYLISTS = [
  { id: 'PLPlLdubQ1fMs-O0_vwxL7bH-S7Bi4jKsu', title: 'Coğrafya',    icon: '🗺️', color: '#3B82F6', pdf: '1E7Mp-izuN5weNycp2WNwVN0G8S6yBjbV' },
  { id: 'PL5w_hbb3voMmmxQhHqC_bmvVtzlDpXfA1', title: 'Tarih',       icon: '🏛️', color: '#F59E0B', pdf: '1-HbIhr0w_JrmgWxIqDCjOXofC1C0jT8a' },
  { id: 'PLPlLdubQ1fMsIk3Kujy9yqJOyFLHsfQlp', title: 'Matematik',   icon: '📐', color: '#22C55E', pdf: '1AnU0-w55Ux1xomVRp_mivR9_43F2OTd3' },
  { id: 'PL5w_hbb3voMm6DLBYyv0VZs9sKidbEpcg', title: 'Türkçe',      icon: '📝', color: '#A855F7', pdf: '13exBbeVK3YTjblR3kzWk55_weyG4kfCC' },
  { id: 'PLPhEmM6X--Wf4b-wPQNtUqCIgomDotaIU', title: 'Vatandaşlık', icon: '⚖️', color: '#EF4444', pdf: '1BPgH1Y27ZB-t0Sfn8E_QABo-3yNkOcOv' },
];
const LETTERS = ['A','B','C','D','E'];

// ════════ AI PANEL (modal/drawer olarak) ════════
function AiPanel({ videoTitle, playlistTitle, onClose }: { videoTitle: string; playlistTitle: string; onClose: () => void }) {
  const [tab, setTab] = useState<'chat'|'quiz'|'summary'>('quiz');
  const [messages, setMessages] = useState<{role:string;content:string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [revealed, setRevealed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  const sendChat = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role:'user', content:msg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: `Video: "${videoTitle}" (${playlistTitle})\n\n${msg}` });
      setMessages(p => [...p, { role:'assistant', content:data.reply }]);
    } catch { toast.error('Hata'); } finally { setLoading(false); }
  };

  const genQuiz = async (count: number, diff: string) => {
    setGenLoading(true); setQuestions([]); setAnswers({}); setRevealed(false);
    try {
      const { data } = await api.post('/ai/generate-questions', { topic:`${videoTitle} - ${playlistTitle}`, count, difficulty:diff });
      setQuestions(data.questions);
      toast.success(`${data.count} soru hazır!`);
    } catch { toast.error('Soru üretilemedi'); } finally { setGenLoading(false); }
  };

  const genSummary = async () => {
    setGenLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message:`"${videoTitle}" konusunu KPSS açısından madde madde, ezber dostu özetle.` });
      setSummary(data.reply);
    } catch { toast.error('Hata'); } finally { setGenLoading(false); }
  };

  const genFlashcards = async () => {
    setGenLoading(true);
    try {
      const { data } = await api.post('/ai/generate-flashcards', { topic:`${videoTitle} - ${playlistTitle}`, count:10 });
      toast.success(`${data.count} flashcard oluşturuldu!`);
    } catch { toast.error('Hata'); } finally { setGenLoading(false); }
  };

  const score = () => { let c=0,w=0; questions.forEach((q,i)=>{ if(!answers[i])return; answers[i]===q.correct_answer?c++:w++; }); return {c,w,net:Math.round((c-w*0.25)*10)/10}; };

  return (
    <div className="flex flex-col h-full bg-[#1E293B]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={15} className="text-primary-light flex-shrink-0" />
          <span className="text-xs font-semibold truncate">AI Asistan</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] flex-shrink-0">
        {[{id:'quiz',l:'⚡ Soru'},{id:'chat',l:'💬 Sohbet'},{id:'summary',l:'📋 Özet'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`flex-1 py-2.5 text-xs font-medium transition-all ${tab===t.id?'border-b-2 border-primary text-primary-light':'text-slate-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* QUIZ */}
      {tab==='quiz' && (
        <div className="flex-1 overflow-y-auto p-3">
          {questions.length===0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed"><strong className="text-white">"{videoTitle.slice(0,40)}..."</strong> konusundan KPSS sorusu üret:</p>
              <div className="grid grid-cols-2 gap-2">
                {[{l:'5 Kolay',c:5,d:'easy'},{l:'10 Orta',c:10,d:'medium'},{l:'5 Zor',c:5,d:'hard'},{l:'10 Karma',c:10,d:'medium'}].map(b=>(
                  <button key={b.l} onClick={()=>genQuiz(b.c,b.d)} disabled={genLoading} className="py-3 rounded-xl border border-primary/20 bg-primary/10 text-primary-light text-xs font-medium disabled:opacity-50 hover:bg-primary/20 transition-colors">
                    {genLoading?'⏳':<Zap size={12} className="inline mr-1"/>}{b.l}
                  </button>
                ))}
              </div>
              <button onClick={genFlashcards} disabled={genLoading} className="w-full py-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-purple-300 text-xs font-medium disabled:opacity-50 hover:bg-secondary/20 transition-colors"><CreditCard size={12} className="inline mr-1"/>10 Flashcard Üret</button>
            </div>
          ) : (
            <div className="space-y-3">
              {revealed && <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex justify-between"><div><div className="text-xs text-slate-400">Net</div><div className="text-lg font-black text-primary-light">{score().net}</div></div><div className="text-right text-xs"><div className="text-success">✅ {score().c}</div><div className="text-red-400">❌ {score().w}</div></div></div>}
              {questions.map((q,qi)=>(
                <div key={qi} className="bg-[#0F172A] rounded-xl p-3 border border-white/[0.06]">
                  <div className="text-[10px] text-slate-500 mb-1">Soru {qi+1}</div>
                  <p className="text-xs font-medium mb-2 leading-relaxed">{q.text}</p>
                  <div className="space-y-1">
                    {(q.options as string[]).map((opt,oi)=>{
                      const L=LETTERS[oi], sel=answers[qi]===L, cor=q.correct_answer===L;
                      let cls='bg-[#1E293B] text-slate-400';
                      if(revealed){ if(cor)cls='bg-success/15 text-success border border-success/30'; else if(sel)cls='bg-red-500/15 text-red-400 border border-red-500/30'; }
                      else if(sel)cls='bg-primary/15 text-primary-light border border-primary/30';
                      return <button key={oi} onClick={()=>!revealed&&setAnswers(p=>({...p,[qi]:L}))} className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-[11px] text-left ${cls}`}><span className="font-bold">{L})</span><span>{opt.replace(/^[A-E]\)\s*/,'')}</span>{revealed&&cor&&<CheckCircle size={12} className="ml-auto"/>}</button>;
                    })}
                  </div>
                  {revealed&&q.explanation&&<div className="mt-2 p-2 rounded-lg bg-white/[0.03] text-[10px] text-slate-400 leading-relaxed">💡 {q.explanation}</div>}
                </div>
              ))}
              {!revealed?<button onClick={()=>setRevealed(true)} className="w-full py-2 rounded-xl bg-primary text-white text-xs font-medium">Sonuçları Gör</button>:<button onClick={()=>{setQuestions([]);setRevealed(false);setAnswers({});}} className="w-full py-2 rounded-xl bg-[#253347] text-slate-300 text-xs">Yeni Soru Üret</button>}
            </div>
          )}
        </div>
      )}

      {/* CHAT */}
      {tab==='chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length===0 && <p className="text-xs text-slate-500 text-center py-8">Video hakkında soru sor 👇</p>}
            {messages.map((m,i)=>(
              <div key={i} className={`flex gap-2 ${m.role==='user'?'flex-row-reverse':''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 ${m.role==='assistant'?'bg-gradient-to-br from-primary to-secondary':'bg-[#253347]'}`}>{m.role==='assistant'?'🎓':'👤'}</div>
                <div className={`text-xs leading-relaxed px-3 py-2 rounded-xl whitespace-pre-wrap max-w-[85%] ${m.role==='assistant'?'bg-[#0F172A] border border-white/[0.06]':'bg-primary text-white'}`}>{m.content}</div>
              </div>
            ))}
            {loading && <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px]">🎓</div><div className="px-3 py-2 rounded-xl bg-[#0F172A] flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div>}
            <div ref={bottomRef}/>
          </div>
          <div className="px-3 pt-2 flex flex-wrap gap-1.5">
            {['Bu konuyu anlat','Ezber tekniği','Önemli yerler'].map(s=>(
              <button key={s} onClick={()=>sendChat(s)} className="text-[10px] px-2 py-1 rounded-full bg-[#0F172A] border border-white/[0.08] text-slate-500 hover:text-white transition-all">{s}</button>
            ))}
          </div>
          <div className="p-3 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Sor..." className="flex-1 bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-primary"/>
            <button onClick={()=>sendChat()} disabled={!input.trim()||loading} className="px-3 py-2 rounded-lg bg-primary disabled:opacity-40 text-white"><Send size={13}/></button>
          </div>
        </div>
      )}

      {/* SUMMARY */}
      {tab==='summary' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {!summary?(
            <button onClick={genSummary} disabled={genLoading} className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-xs font-medium disabled:opacity-50">{genLoading?'⏳ Hazırlanıyor...':'📋 AI Özet Oluştur'}</button>
          ):(
            <>
              <div className="bg-[#0F172A] rounded-xl p-3 border border-white/[0.06]"><div className="text-[10px] text-primary-light font-semibold mb-2">📋 KPSS ÖZETİ</div><div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{summary}</div></div>
              <button onClick={()=>setSummary('')} className="w-full py-2 rounded-xl bg-[#253347] text-slate-400 text-xs">Yenile</button>
            </>
          )}
          <button onClick={genFlashcards} disabled={genLoading} className="w-full py-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-purple-300 text-xs font-medium"><CreditCard size={12} className="inline mr-1"/>Flashcard Oluştur</button>
        </div>
      )}
    </div>
  );
}

// ════════ VIDEO LİSTESİ ════════
function VideoList({ videos, activeVideo, onSelect, color, watched }: any) {
  const [search, setSearch] = useState('');
  const filtered = search ? videos.filter((v:any)=>v.title.toLowerCase().includes(search.toLowerCase())) : videos;
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 flex-shrink-0 border-b border-white/[0.06]">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Video ara..." className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-primary"/>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map((v:any)=>{
          const active=activeVideo?.id===v.id;
          const idx=videos.findIndex((x:any)=>x.id===v.id);
          const isW=watched?.has(v.id);
          return (
            <button key={v.id} onClick={()=>onSelect(v)} className={`w-full flex items-start gap-2 p-2 rounded-xl text-left transition-all mb-1 ${active?'border':'hover:bg-[#253347]'}`} style={active?{background:color+'18',borderColor:color+'40'}:{}}>
              <div className="relative flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-[#253347]">
                {v.thumbnail?<img src={v.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy"/>:<div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">{idx+1}</div>}
                {active&&<div className="absolute inset-0 flex items-center justify-center" style={{background:color+'90'}}><span className="text-white text-sm">▶</span></div>}
                {isW&&!active&&<div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center"><CheckCircle size={9} className="text-white"/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium leading-snug line-clamp-2">{v.title}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">#{idx+1}{isW&&' · ✓ izlendi'}</div>
              </div>
            </button>
          );
        })}
        {filtered.length===0&&<div className="text-center py-6 text-slate-600 text-xs">Bulunamadı</div>}
      </div>
    </div>
  );
}

// ════════ ANA SAYFA ════════
export default function VideoPage() {
  const [activePl,setActivePl]=useState(PLAYLISTS[0]);
  const [videos,setVideos]=useState<any[]>([]);
  const [activeVideo,setActiveVideo]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [watched,setWatched]=useState<Set<string>>(new Set());
  const [showAi,setShowAi]=useState(false);
  const [showPdf,setShowPdf]=useState(false);
  const [mobilePanel,setMobilePanel]=useState<'list'|'video'>('list');

  useEffect(()=>{ const w=localStorage.getItem('kpss_watched'); if(w)setWatched(new Set(JSON.parse(w))); },[]);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true); setError(''); setVideos([]); setActiveVideo(null);
    api.get(`/youtube/playlist/${activePl.id}`)
      .then(r=>{ if(cancelled)return; setVideos(r.data.videos); setActiveVideo(r.data.videos[0]??null); })
      .catch(e=>{ if(!cancelled)setError(e.response?.data?.error||'Yüklenemedi'); })
      .finally(()=>{ if(!cancelled)setLoading(false); });
    return ()=>{ cancelled=true; };
  },[activePl.id]);

  const markWatched=(id:string)=>{ const u=new Set(watched).add(id); setWatched(u); localStorage.setItem('kpss_watched',JSON.stringify(Array.from(u))); api.post('/study/daily/increment',{type:'videos',amount:1}).catch(()=>{}); };
  const curIdx=videos.findIndex(v=>v.id===activeVideo?.id);
  const watchedCount=videos.filter(v=>watched.has(v.id)).length;

  const selectVideo=(v:any)=>{ setActiveVideo(v); setMobilePanel('video'); };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen overflow-hidden">

      {/* ÜST BAR: Ders seçici (yatay) */}
      <div className="flex-shrink-0 border-b border-white/[0.08] bg-[#1E293B]">
        <div className="flex gap-2 p-2 overflow-x-auto">
          {PLAYLISTS.map(pl=>(
            <button key={pl.id} onClick={()=>{ if(pl.id!==activePl.id){ setActivePl(pl); setShowPdf(false); setShowAi(false); } }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0 ${activePl.id===pl.id?'text-white':'text-slate-400 hover:text-white'}`}
              style={activePl.id===pl.id?{background:pl.color+'20',border:`1px solid ${pl.color}40`}:{background:'#0F172A'}}>
              <span className="text-base">{pl.icon}</span>
              <span className="text-xs font-medium">{pl.title}</span>
              {activePl.id===pl.id && videos.length>0 && <span className="text-[10px] text-slate-400">({watchedCount}/{videos.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* MOBİL: Liste/Video sekme değiştirici */}
      <div className="md:hidden flex border-b border-white/[0.08] flex-shrink-0">
        <button onClick={()=>setMobilePanel('list')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${mobilePanel==='list'?'border-b-2 border-primary text-primary-light':'text-slate-500'}`}><List size={14}/>Videolar ({videos.length})</button>
        <button onClick={()=>setMobilePanel('video')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${mobilePanel==='video'?'border-b-2 border-primary text-primary-light':'text-slate-500'}`}>▶ İzle</button>
      </div>

      {/* ANA İÇERİK */}
      <div className="flex-1 flex overflow-hidden">

        {/* SOL: Video listesi (masaüstü hep açık, mobilde sekmeli) */}
        <div className={`${mobilePanel==='list'?'flex':'hidden'} md:flex w-full md:w-72 border-r border-white/[0.08] flex-col flex-shrink-0`}>
          {loading ? (
            <div className="p-3 space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="flex gap-2 animate-pulse"><div className="w-20 h-12 rounded bg-[#253347]"/><div className="flex-1 space-y-2 pt-1"><div className="h-2.5 bg-[#253347] rounded"/><div className="h-2 bg-[#253347] rounded w-2/3"/></div></div>)}</div>
          ) : error ? (
            <div className="p-4 text-center"><div className="text-red-400 text-sm">⚠️ {error}</div></div>
          ) : (
            <VideoList videos={videos} activeVideo={activeVideo} onSelect={selectVideo} color={activePl.color} watched={watched}/>
          )}
        </div>

        {/* ORTA: Player */}
        <div className={`${mobilePanel==='video'?'flex':'hidden'} md:flex flex-1 flex-col overflow-hidden min-w-0`}>
          <div className="flex-1 overflow-y-auto">
            {/* Player */}
            <div className="p-3">
              <div className="rounded-xl overflow-hidden bg-black w-full" style={{aspectRatio:'16/9'}}>
                {activeVideo?(
                  <iframe key={activeVideo.id} src={`https://www.youtube.com/embed/${activeVideo.id}?rel=0&modestbranding=1`} title={activeVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" onLoad={()=>activeVideo&&markWatched(activeVideo.id)}/>
                ):(
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">{loading?'Yükleniyor...':'Video seç'}</div>
                )}
              </div>
            </div>

            {/* Video bilgi + butonlar */}
            {activeVideo&&(
              <div className="px-3 pb-3">
                <h2 className="text-sm md:text-base font-semibold leading-snug mb-1">{activeVideo.title}</h2>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] text-slate-500">{activePl.icon} {activePl.title}</span>
                  <span className="text-[11px] text-slate-600">#{curIdx+1}/{videos.length}</span>
                  {watched.has(activeVideo.id)&&<span className="text-[11px] text-success">✓ İzlendi</span>}
                </div>

                {/* Aksiyon butonları */}
                <div className="flex gap-2 mb-3">
                  <button onClick={()=>setShowAi(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-medium hover:opacity-90 transition-opacity">
                    <Sparkles size={15}/> AI ile Çalış
                  </button>
                  {activePl.pdf && (
                    <button onClick={()=>setShowPdf(true)} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors">
                      <FileText size={15}/> Ders Notu
                    </button>
                  )}
                </div>

                {/* Önceki/Sonraki */}
                <div className="flex gap-2">
                  <button onClick={()=>curIdx>0&&selectVideo(videos[curIdx-1])} disabled={curIdx<=0} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#253347] text-slate-400 text-xs hover:text-white disabled:opacity-30 transition-colors"><ChevronLeft size={14}/>Önceki</button>
                  <button onClick={()=>curIdx<videos.length-1&&selectVideo(videos[curIdx+1])} disabled={curIdx>=videos.length-1} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#253347] text-slate-400 text-xs hover:text-white disabled:opacity-30 transition-colors">Sonraki<ChevronRight size={14}/></button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: AI Panel (masaüstü - açıldığında) */}
        {showAi && activeVideo && (
          <div className="hidden md:flex w-80 border-l border-white/[0.08] flex-col flex-shrink-0">
            <AiPanel videoTitle={activeVideo.title} playlistTitle={activePl.title} onClose={()=>setShowAi(false)}/>
          </div>
        )}
      </div>

      {/* MOBİL: AI Panel (tam ekran modal) */}
      {showAi && activeVideo && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0F172A]">
          <AiPanel videoTitle={activeVideo.title} playlistTitle={activePl.title} onClose={()=>setShowAi(false)}/>
        </div>
      )}

      {/* PDF Görüntüleyici (tam ekran) */}
      {showPdf && activePl.pdf && (
        <div className="fixed inset-0 z-50 bg-[#0F172A] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-red-400" />
              <span className="text-sm font-semibold">{activePl.title} — Ders Notu</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={`https://drive.google.com/file/d/${activePl.pdf}/view`} target="_blank" rel="noreferrer"
                className="text-xs text-primary-light hover:text-white px-3 py-1.5 rounded-lg bg-primary/10 transition-colors">
                Yeni Sekmede Aç ↗
              </a>
              <button onClick={()=>setShowPdf(false)} className="text-slate-400 hover:text-white p-1.5"><X size={18}/></button>
            </div>
          </div>
          <div className="flex-1 bg-[#1E1E1E]">
            <iframe
              src={`https://drive.google.com/file/d/${activePl.pdf}/preview`}
              className="w-full h-full"
              allow="autoplay"
              title="Ders Notu PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
}
