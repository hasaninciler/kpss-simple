'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, Circle, Clock, Zap } from 'lucide-react';

const SUBJECT_META: Record<string, { icon: string; color: string }> = {
  'Coğrafya':    { icon: '🗺️', color: '#3B82F6' },
  'Tarih':       { icon: '🏛️', color: '#F59E0B' },
  'Matematik':   { icon: '📐', color: '#22C55E' },
  'Türkçe':      { icon: '📝', color: '#A855F7' },
  'Vatandaşlık': { icon: '⚖️', color: '#EF4444' },
};

const STATUS = {
  not_started: { label: 'Başlanmadı', icon: Circle, color: 'text-slate-500', next: 'studying' },
  studying:    { label: 'Çalışılıyor', icon: Clock, color: 'text-warning', next: 'done' },
  done:        { label: 'Bitti', icon: CheckCircle, color: 'text-success', next: 'not_started' },
};

export default function KonularPage() {
  const [topics, setTopics] = useState<Record<string, any[]>>({});
  const [active, setActive] = useState('Coğrafya');

  const load = () => api.get('/study/topics').then(r => setTopics(r.data));
  useEffect(() => { load(); }, []);

  const cycle = async (subject: string, topic: string, currentStatus: string) => {
    const next = STATUS[currentStatus as keyof typeof STATUS].next;
    setTopics(prev => ({
      ...prev,
      [subject]: prev[subject].map(t => t.topic === topic ? { ...t, status: next } : t),
    }));
    await api.post('/study/topics', { subject, topic, status: next });
  };

  const genQuestions = async (topic: string) => {
    const t = toast.loading('Soru üretiliyor...');
    try {
      await api.post('/ai/generate-questions', { topic: `${active} - ${topic}`, count: 10, difficulty: 'medium' });
      toast.success('10 soru üretildi! Quiz sayfasına git', { id: t });
    } catch { toast.error('Hata', { id: t }); }
  };

  const subjectTopics = topics[active] || [];
  const doneCount = subjectTopics.filter(t => t.status === 'done').length;
  const studyingCount = subjectTopics.filter(t => t.status === 'studying').length;
  const progress = subjectTopics.length ? Math.round((doneCount / subjectTopics.length) * 100) : 0;
  const meta = SUBJECT_META[active];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-lg md:text-xl font-bold mb-1">📚 Konu Takibi</h1>
      <p className="text-xs text-slate-500 mb-4">Hangi konuyu bitirdin, hangisi eksik — takip et</p>

      {/* Ders seçici */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {Object.keys(SUBJECT_META).map(subject => {
          const m = SUBJECT_META[subject];
          const st = topics[subject] || [];
          const done = st.filter(t => t.status === 'done').length;
          return (
            <button key={subject} onClick={() => setActive(subject)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0 ${active === subject ? 'text-white' : 'text-slate-400 bg-[#1E293B]'}`}
              style={active === subject ? { background: m.color + '20', border: `1px solid ${m.color}40` } : {}}>
              <span>{m.icon}</span>
              <span className="text-xs font-medium">{subject}</span>
              {st.length > 0 && <span className="text-[10px] text-slate-500">{done}/{st.length}</span>}
            </button>
          );
        })}
      </div>

      {/* İlerleme özeti */}
      <div className="card mb-4" style={{ borderColor: meta.color + '30' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <div className="text-sm font-semibold">{active}</div>
              <div className="text-[11px] text-slate-500">{doneCount} bitti · {studyingCount} devam ediyor · {subjectTopics.length - doneCount - studyingCount} kaldı</div>
            </div>
          </div>
          <div className="text-2xl font-black" style={{ color: meta.color }}>{progress}%</div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: meta.color }} />
        </div>
      </div>

      {/* Konu listesi */}
      <div className="space-y-2">
        {subjectTopics.map((t, i) => {
          const s = STATUS[t.status as keyof typeof STATUS];
          const Icon = s.icon;
          return (
            <div key={i} className="card flex items-center gap-3 py-3">
              <button onClick={() => cycle(active, t.topic, t.status)} className="flex-shrink-0">
                <Icon size={20} className={s.color} />
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${t.status === 'done' ? 'text-slate-500 line-through' : ''}`}>{t.topic}</div>
                <button onClick={() => cycle(active, t.topic, t.status)} className={`text-[11px] ${s.color}`}>{s.label}</button>
              </div>
              <button onClick={() => genQuestions(t.topic)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary-light text-xs hover:bg-primary/25 transition-colors flex-shrink-0">
                <Zap size={11} /> Soru
              </button>
            </div>
          );
        })}
      </div>

      {subjectTopics.length === 0 && <div className="text-center py-8 text-slate-600 text-sm">Yükleniyor...</div>}
    </div>
  );
}
