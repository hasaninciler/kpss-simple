'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Zap, CreditCard, Loader, Sparkles } from 'lucide-react';

const POPULAR_TOPICS: Record<string, string[]> = {
  '🗺️ Coğrafya': ["Türkiye'nin İklimi", "Coğrafi Bölgeler", "Yer Şekilleri", "Nüfus ve Yerleşme", "Akarsular ve Göller"],
  '🏛️ Tarih': ["Osmanlı Kuruluşu", "Kurtuluş Savaşı", "İnkılaplar", "İlk Türk Devletleri", "Atatürk İlkeleri"],
  '📐 Matematik': ["Sayılar", "Problemler", "Kesirler", "Oran Orantı", "Üslü Sayılar"],
  '📝 Türkçe': ["Sözcük Türleri", "Cümlenin Ögeleri", "Paragraf", "Anlatım Bozukluğu", "Yazım Kuralları"],
  '⚖️ Vatandaşlık': ["1982 Anayasası", "Temel Haklar", "Yasama", "Yürütme", "Yargı"],
};

export default function SoruUretPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);

  const generate = async (mode: 'quiz' | 'flashcard') => {
    if (!topic.trim()) { toast.error('Bir konu yaz veya seç'); return; }
    setGenerating(true);
    try {
      if (mode === 'quiz') {
        const { data } = await api.post('/ai/generate-questions', { topic, count, difficulty });
        if (!data.questions?.length) { toast.error('Soru üretilemedi, tekrar dene'); return; }
        // Soruları localStorage'a koy, quiz sayfası oradan alsın
        localStorage.setItem('kpss_generated_quiz', JSON.stringify({
          questions: data.questions,
          source: topic,
          createdAt: Date.now(),
        }));
        toast.success(`${data.count} soru hazır! Quiz'e yönlendiriliyorsun...`);
        setTimeout(() => router.push('/quiz?generated=1'), 600);
      } else {
        const { data } = await api.post('/ai/generate-flashcards', { topic, count: 15 });
        toast.success(`${data.count} flashcard oluşturuldu!`);
        setTimeout(() => router.push('/flashcard'), 600);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Hata, tekrar dene');
    } finally { setGenerating(false); }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={20} className="text-primary-light" />
        <h1 className="text-lg md:text-xl font-bold">AI Soru Üret</h1>
      </div>
      <p className="text-xs text-slate-500 mb-5">Bir konu yaz, AI sana KPSS tarzı sorular üretsin. Üretince hemen çözmeye başlarsın.</p>

      {/* Konu girişi */}
      <div className="card mb-4">
        <label className="text-sm font-medium block mb-2">Hangi konudan?</label>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="örn: Türkiye'nin iklim tipleri, Osmanlı kuruluş dönemi..."
          className="input text-base"
          onKeyDown={e => e.key === 'Enter' && generate('quiz')}
          autoFocus
        />

        {/* Ayarlar */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div>
            <div className="text-[11px] text-slate-500 mb-1.5">Soru Sayısı</div>
            <div className="flex gap-1">
              {[5, 10, 20].map(n => (
                <button key={n} onClick={() => setCount(n)} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${count === n ? 'bg-primary text-white' : 'bg-[#253347] text-slate-400'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 mb-1.5">Zorluk</div>
            <div className="flex gap-1">
              {[{ v: 'easy', l: 'Kolay' }, { v: 'medium', l: 'Orta' }, { v: 'hard', l: 'Zor' }].map(d => (
                <button key={d.v} onClick={() => setDifficulty(d.v)} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${difficulty === d.v ? 'bg-primary text-white' : 'bg-[#253347] text-slate-400'}`}>{d.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex gap-2 mt-5">
          <button onClick={() => generate('quiz')} disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-light text-white font-semibold transition-colors disabled:opacity-50">
            {generating ? <><Loader size={16} className="animate-spin" /> Üretiliyor...</> : <><Zap size={16} /> Soru Üret & Çöz</>}
          </button>
          <button onClick={() => generate('flashcard')} disabled={generating}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary/20 text-purple-300 hover:bg-secondary/30 font-medium transition-colors disabled:opacity-50">
            <CreditCard size={16} /> Flashcard
          </button>
        </div>
      </div>

      {/* Popüler konular */}
      <div className="card">
        <div className="text-sm font-medium mb-3">💡 Popüler Konular</div>
        <div className="space-y-3">
          {Object.entries(POPULAR_TOPICS).map(([subject, topics]) => (
            <div key={subject}>
              <div className="text-xs text-slate-500 mb-1.5">{subject}</div>
              <div className="flex flex-wrap gap-1.5">
                {topics.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${topic === t ? 'bg-primary/20 text-primary-light border border-primary/40' : 'bg-[#253347] text-slate-400 hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
