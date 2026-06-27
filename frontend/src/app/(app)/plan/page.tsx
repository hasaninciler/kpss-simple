'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Check, Trash2, Sparkles, Clock, Calendar, ChevronLeft, ChevronRight, X, Coffee, BookOpen, Flag } from 'lucide-react';

const SUBJECTS = [
  { name: 'Coğrafya', icon: '🗺️', color: '#3B82F6' },
  { name: 'Tarih', icon: '🏛️', color: '#F59E0B' },
  { name: 'Matematik', icon: '📐', color: '#22C55E' },
  { name: 'Türkçe', icon: '📝', color: '#A855F7' },
  { name: 'Vatandaşlık', icon: '⚖️', color: '#EF4444' },
  { name: 'Genel', icon: '📚', color: '#64748B' },
];

const subjectMeta = (name?: string) => SUBJECTS.find(s => s.name === name) || SUBJECTS[5];

function fmtDate(d: Date) { return d.toISOString().split('T')[0]; }
function dateLabel(dateStr: string) {
  const today = fmtDate(new Date());
  const tom = fmtDate(new Date(Date.now() + 86400000));
  const yest = fmtDate(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Bugün';
  if (dateStr === tom) return 'Yarın';
  if (dateStr === yest) return 'Dün';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

export default function PlanPage() {
  const [date, setDate] = useState(fmtDate(new Date()));
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [aiHours, setAiHours] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fSubject, setFSubject] = useState('Genel');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fType, setFType] = useState('study');
  const [fPriority, setFPriority] = useState('normal');

  const load = (d = date) => {
    setLoading(true);
    api.get('/planner', { params: { date: d } }).then(r => setTasks(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [date]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(fmtDate(d));
  };

  const addTask = async () => {
    if (!fTitle.trim()) { toast.error('Görev başlığı yaz'); return; }
    let dur = 30;
    if (fStart && fEnd) {
      const [sh, sm] = fStart.split(':').map(Number);
      const [eh, em] = fEnd.split(':').map(Number);
      dur = (eh * 60 + em) - (sh * 60 + sm);
    }
    await api.post('/planner', {
      title: fTitle, subject: fType === 'break' ? null : fSubject,
      time_start: fStart, time_end: fEnd, duration_min: dur > 0 ? dur : 30,
      type: fType, priority: fPriority, plan_date: date,
    });
    setFTitle(''); setFStart(''); setFEnd(''); setShowForm(false);
    load();
    toast.success('Eklendi!');
  };

  const toggleDone = async (task: any) => {
    setTasks(p => p.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
    await api.patch(`/planner/${task.id}`, { done: !task.done });
  };

  const delTask = async (id: number) => {
    setTasks(p => p.filter(t => t.id !== id));
    await api.delete(`/planner/${id}`);
  };

  const aiGenerate = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post('/planner/ai-generate', { hours: aiHours, plan_date: date });
      toast.success(`${data.count} maddelik plan oluşturuldu!`);
      load();
    } catch { toast.error('Plan oluşturulamadı'); }
    finally { setAiLoading(false); }
  };

  const doneCount = tasks.filter(t => t.done && t.type !== 'break').length;
  const studyTasks = tasks.filter(t => t.type !== 'break');
  const totalMin = studyTasks.reduce((s, t) => s + (t.duration_min || 0), 0);
  const doneMin = studyTasks.filter(t => t.done).reduce((s, t) => s + (t.duration_min || 0), 0);
  const progress = studyTasks.length ? Math.round((doneCount / studyTasks.length) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg md:text-xl font-bold">📅 Günlük Plan</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-colors">
          <Plus size={15} /> Ekle
        </button>
      </div>

      {/* Tarih navigasyonu */}
      <div className="card mb-4 flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-[#253347] text-slate-400 transition-colors"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <div className="text-sm font-semibold flex items-center gap-1.5 justify-center"><Calendar size={14} className="text-primary-light" />{dateLabel(date)}</div>
          <div className="text-[11px] text-slate-500">{new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-[#253347] text-slate-400 transition-colors"><ChevronRight size={18} /></button>
      </div>

      {/* İlerleme özeti */}
      {studyTasks.length > 0 && (
        <div className="card mb-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Günün İlerlemesi</div>
            <div className="text-lg font-black text-primary-light">{progress}%</div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>✅ {doneCount}/{studyTasks.length} görev</span>
            <span>⏱ {Math.floor(doneMin/60)}s {doneMin%60}dk / {Math.floor(totalMin/60)}s {totalMin%60}dk</span>
          </div>
        </div>
      )}

      {/* AI Plan oluştur */}
      {tasks.length === 0 && !loading && (
        <div className="card mb-4 text-center py-8">
          <div className="text-4xl mb-3">🤖</div>
          <div className="text-sm font-semibold mb-1">Plan boş</div>
          <p className="text-xs text-slate-500 mb-4">AI senin için günlük çalışma planı oluştursun</p>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs text-slate-400">Günde</span>
            <select value={aiHours} onChange={e => setAiHours(Number(e.target.value))} className="bg-[#0F172A] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
              {[3,4,5,6,7,8].map(h => <option key={h} value={h}>{h} saat</option>)}
            </select>
          </div>
          <button onClick={aiGenerate} disabled={aiLoading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <Sparkles size={15} /> {aiLoading ? 'Plan hazırlanıyor...' : 'AI Plan Oluştur'}
          </button>
        </div>
      )}

      {/* Görev listesi - zaman çizelgesi */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-[#1E293B] animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const m = subjectMeta(task.subject);
            const isBreak = task.type === 'break';
            return (
              <div key={task.id} className={`relative rounded-xl border transition-all overflow-hidden ${task.done ? 'opacity-60 border-white/[0.06] bg-[#1E293B]/50' : 'border-white/[0.08] bg-[#1E293B]'}`}>
                {/* Sol renkli şerit */}
                {!isBreak && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: m.color }} />}

                <div className="flex items-center gap-3 p-3 pl-4">
                  {/* Checkbox */}
                  <button onClick={() => toggleDone(task)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.done ? 'border-success bg-success' : 'border-slate-600 hover:border-primary'}`}>
                    {task.done && <Check size={13} className="text-white" />}
                  </button>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isBreak && <Coffee size={13} className="text-amber-400 flex-shrink-0" />}
                      {!isBreak && <span className="text-sm flex-shrink-0">{m.icon}</span>}
                      <span className={`text-sm font-medium truncate ${task.done ? 'line-through text-slate-500' : ''}`}>{task.title}</span>
                      {task.priority === 'high' && !task.done && <Flag size={11} className="text-red-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.time_start && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock size={10} /> {task.time_start}{task.time_end && ` - ${task.time_end}`}
                        </span>
                      )}
                      {task.duration_min > 0 && <span className="text-[11px] text-slate-600">{task.duration_min} dk</span>}
                      {task.subject && !isBreak && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: m.color + '20', color: m.color }}>{task.subject}</span>}
                    </div>
                  </div>

                  {/* Sil */}
                  <button onClick={() => delTask(task.id)} className="text-slate-600 hover:text-red-400 p-1 transition-colors flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Hızlı ekleme */}
          {tasks.length > 0 && (
            <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl border border-dashed border-white/10 text-slate-500 text-sm hover:border-primary/40 hover:text-primary-light transition-all flex items-center justify-center gap-1.5">
              <Plus size={15} /> Görev Ekle
            </button>
          )}
        </div>
      )}

      {/* Görev ekleme modalı */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative w-full md:max-w-md bg-[#1E293B] border border-white/[0.08] rounded-t-2xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-bold">Yeni Görev</div>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              {/* Tip */}
              <div className="flex gap-2">
                <button onClick={() => setFType('study')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${fType === 'study' ? 'bg-primary text-white' : 'bg-[#0F172A] text-slate-400'}`}>📖 Çalışma</button>
                <button onClick={() => setFType('break')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${fType === 'break' ? 'bg-amber-500 text-white' : 'bg-[#0F172A] text-slate-400'}`}>☕ Mola</button>
              </div>

              {/* Başlık */}
              <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder={fType === 'break' ? 'Mola...' : 'örn: Coğrafya iklim konusu çöz'} className="input" onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus />

              {/* Ders seçimi */}
              {fType === 'study' && (
                <div>
                  <div className="text-[11px] text-slate-500 mb-1.5">Ders</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBJECTS.map(s => (
                      <button key={s.name} onClick={() => setFSubject(s.name)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${fSubject === s.name ? 'text-white' : 'text-slate-400 bg-[#0F172A]'}`}
                        style={fSubject === s.name ? { background: s.color + '30', border: `1px solid ${s.color}` } : {}}>
                        {s.icon} {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saat */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-[11px] text-slate-500 mb-1">Başlangıç</div>
                  <input type="time" value={fStart} onChange={e => setFStart(e.target.value)} className="input" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-slate-500 mb-1">Bitiş</div>
                  <input type="time" value={fEnd} onChange={e => setFEnd(e.target.value)} className="input" />
                </div>
              </div>

              {/* Öncelik */}
              {fType === 'study' && (
                <div className="flex gap-2">
                  {[{ v: 'normal', l: 'Normal' }, { v: 'high', l: '🔴 Öncelikli' }].map(p => (
                    <button key={p.v} onClick={() => setFPriority(p.v)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${fPriority === p.v ? 'bg-[#253347] text-white' : 'bg-[#0F172A] text-slate-500'}`}>{p.l}</button>
                  ))}
                </div>
              )}

              <button onClick={addTask} className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-medium transition-colors">Ekle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
