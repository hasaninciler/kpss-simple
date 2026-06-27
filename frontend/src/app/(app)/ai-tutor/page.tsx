'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'Türkiye\'nin iklim tiplerini anlat',
  '1982 Anayasası\'nı özetle',
  'Osmanlı\'nın kuruluşunu anlat',
  'KPSS Matematik ipuçları ver',
  'Ezber tekniği öner',
];

export default function AiTutorPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/ai/chat').then(r => {
      if (r.data.length) setMessages(r.data);
      else setMessages([{ role: 'assistant', content: 'Merhaba! Ben KPSS AI Öğretmeninim 🎓\n\nHerhangi bir konuyu sorabilirsin. KPSS müfredatında yardımcı olabilirim.' }]);
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: msg });
      setMessages(p => [...p, { role: 'assistant', content: data.reply }]);
    } catch { toast.error('AI yanıt veremedi'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <div className="px-7 py-4 border-b border-white/[0.08]">
        <h1 className="text-lg font-bold">🤖 AI Öğretmen</h1>
        <p className="text-xs text-slate-400">KPSS konularında yardım al</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse ml-auto max-w-[75%]' : 'max-w-[80%]'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${m.role === 'assistant' ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-[#253347]'}`}>
              {m.role === 'assistant' ? '🎓' : '👤'}
            </div>
            <div className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'assistant' ? 'bg-[#1E293B] border border-white/[0.08]' : 'bg-primary text-white'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 max-w-[80%]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs">🎓</div>
            <div className="px-4 py-3 rounded-xl bg-[#1E293B] border border-white/[0.08] flex gap-1">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-7 py-4 border-t border-white/[0.08] bg-[#1E293B]">
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1 rounded-full bg-[#253347] border border-white/[0.08] text-slate-400 hover:text-white hover:border-primary/40 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder="Bir şey sor..."
            rows={2}
            className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary transition-colors resize-none"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} className="self-end px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light disabled:opacity-40 text-white transition-colors flex items-center gap-1.5 text-sm">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
