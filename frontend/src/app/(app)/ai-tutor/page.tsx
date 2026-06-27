'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  "Türkiye'nin iklim tiplerini anlat",
  "1982 Anayasası'nı özetle",
  "Osmanlı'nın kuruluşunu anlat",
  "Sözcük türlerini açıkla",
  "KPSS matematik ipuçları",
  "Ezber tekniği öner",
];

export default function AiTutorPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/ai/chat').then(r => {
      if (r.data.length) setMessages(r.data);
      else setMessages([{
        role: 'assistant',
        content: 'Merhaba! Ben KPSS AI Öğretmeninim 🎓\n\nHerhangi bir KPSS konusunu sorabilirsin:\n• Konu anlatımı\n• Örnek soru\n• Ezber teknikleri\n• KPSS ipuçları\n\nNe öğrenmek istersin?'
      }]);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: msg });
      setMessages(p => [...p, { role: 'assistant', content: data.reply }]);
    } catch { toast.error('AI yanıt veremedi'); }
    finally { setLoading(false); }
  };

  const clearChat = async () => {
    if (!confirm('Sohbeti sil?')) return;
    setMessages([{
      role: 'assistant',
      content: 'Sohbet temizlendi. Yeni bir konudan başlayalım! 🎓'
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-bold">🤖 AI Öğretmen</h1>
          <p className="text-[11px] text-slate-500">DeepSeek AI destekli KPSS asistanı</p>
        </div>
        <button onClick={clearChat} className="text-slate-500 hover:text-red-400 transition-colors p-1.5">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse ml-8 md:ml-16' : 'mr-8 md:mr-16'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${m.role === 'assistant' ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-[#253347]'}`}>
              {m.role === 'assistant' ? '🎓' : '👤'}
            </div>
            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'assistant'
                ? 'bg-[#1E293B] border border-white/[0.08] rounded-tl-sm'
                : 'bg-primary text-white rounded-tr-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 mr-16">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs flex-shrink-0">🎓</div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1E293B] border border-white/[0.08] flex gap-1 items-center">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-6 py-3 border-t border-white/[0.08] bg-[#1E293B] flex-shrink-0">
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#253347] border border-white/[0.06] text-slate-400 hover:text-white hover:border-primary/40 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder="Bir konu sor..."
            rows={2}
            className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary transition-colors resize-none"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="self-end px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light disabled:opacity-40 text-white transition-colors">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
