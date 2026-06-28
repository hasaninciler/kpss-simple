'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, RotateCcw, CreditCard, BookX, Plus, X, Sparkles, Loader, Trash2, Camera, Image as ImageIcon } from 'lucide-react';

const LETTERS = ['A','B','C','D','E'];
const SUBJECTS = ['Coğrafya','Tarih','Matematik','Türkçe','Vatandaşlık','Genel'];

export default function YanlislarimPage() {
  const [wrongs, setWrongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [explaining, setExplaining] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Manuel ekleme formu
  const [fText, setFText] = useState('');
  const [fOptions, setFOptions] = useState(['', '', '', '', '']);
  const [fCorrect, setFCorrect] = useState('');
  const [fSubject, setFSubject] = useState('Genel');
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/study/wrong').then(r => setWrongs(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Fotoğraftan soru yükle
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    const t = toast.loading('Fotoğraf hazırlanıyor...');
    try {
      // Fotoğrafı tarayıcıda küçült (büyük telefon fotoğrafları için)
      const base64 = await compressImage(file);

      toast.loading('AI fotoğraftaki soruyu okuyor...', { id: t });
      const { data } = await api.post('/study/wrong/from-photo', {
        imageBase64: base64,
        mimeType: 'image/jpeg',
      });
      toast.success('Soru eklendi! Kendin dene, hazır olunca AI\'ya sor.', { id: t });
      setShowAdd(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fotoğraf okunamadı', { id: t });
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  // Fotoğrafı küçültüp base64 döndür
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          // En fazla 1600px genişlik/yükseklik
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = (height / width) * maxDim; width = maxDim; }
            else { width = (width / height) * maxDim; height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('canvas yok')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          // JPEG %80 kalite — okunabilir ama küçük
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = reject;
        img.src = ev.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addManual = async () => {
    if (!fText.trim()) { toast.error('Soru metni yaz'); return; }
    const filledOptions = fOptions.filter(o => o.trim()).map((o, i) => `${LETTERS[i]}) ${o.trim()}`);
    setSaving(true);
    try {
      await api.post('/study/wrong/manual', {
        question_text: fText,
        options: filledOptions,
        correct_answer: fCorrect,
        subject: fSubject,
      });
      toast.success('Soru eklendi! AI ile çözebilirsin.');
      setFText(''); setFOptions(['','','','','']); setFCorrect(''); setShowAdd(false);
      load();
    } catch { toast.error('Eklenemedi'); }
    finally { setSaving(false); }
  };

  const explainWithAI = async (id: number) => {
    setExplaining(id);
    try {
      const { data } = await api.post(`/study/wrong/${id}/explain`);
      setWrongs(p => p.map(w => w.id === id ? { ...w, explanation: data.explanation } : w));
      setRevealed(p => ({ ...p, [id]: true }));
      toast.success('AI açıkladı!');
    } catch (e: any) { toast.error(e.response?.data?.error || 'AI açıklayamadı'); }
    finally { setExplaining(null); }
  };

  const checkAnswer = (id: number, w: any, letter: string) => {
    setSelected(p => ({ ...p, [id]: letter }));
    setRevealed(p => ({ ...p, [id]: true }));
  };

  const markSolved = async (id: number) => {
    await api.post(`/study/wrong/${id}/solved`);
    setWrongs(p => p.filter(w => w.id !== id));
    toast.success('Tebrikler! Öğrendin 🎉');
  };

  const makeFlashcards = async () => {
    const t = toast.loading('Flashcardlar oluşturuluyor...');
    try {
      const { data } = await api.post('/study/wrong-to-flashcards');
      toast.success(`${data.count} flashcard oluşturuldu!`, { id: t });
    } catch { toast.error('Hata', { id: t }); }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg md:text-xl font-bold">📕 Yanlışlarım</h1>
        <div className="flex gap-2">
          {wrongs.length > 0 && (
            <button onClick={makeFlashcards} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/15 text-purple-300 text-xs hover:bg-secondary/25 transition-colors">
              <CreditCard size={13} /> Flashcard
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-light transition-colors">
            <Plus size={13} /> Soru Ekle
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">Quiz yanlışların + kitaptan çözemediğin sorular. AI sana açıklar.</p>

      {loading ? (
        <div className="text-center py-12 text-slate-600 text-sm">Yükleniyor...</div>
      ) : wrongs.length === 0 ? (
        <div className="card text-center py-12">
          <BookX size={40} className="mx-auto text-slate-600 mb-3" />
          <div className="text-sm font-medium mb-1">Henüz yanlış yok</div>
          <p className="text-xs text-slate-500 mb-5">Quiz çöz ya da kitaptan çözemediğin soruyu ekle, AI sana çözsün.</p>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">
            <Plus size={15} /> Soru Ekle
          </button>
        </div>
      ) : (
        <>
          <div className="card mb-4 bg-warning/5 border-warning/20 flex items-center gap-3">
            <div className="text-2xl">📚</div>
            <div>
              <div className="text-sm font-semibold text-warning">{wrongs.length} soru bekliyor</div>
              <div className="text-xs text-slate-500">Çöz, AI'ya sor, öğrenince sil</div>
            </div>
          </div>

          <div className="space-y-3">
            {wrongs.map((w) => {
              let opts: string[] = [];
              try { opts = typeof w.options === 'string' ? JSON.parse(w.options) : (w.options || []); } catch {}
              const hasOptions = opts.length > 0;
              return (
                <div key={w.id} className="card">
                  <div className="flex items-center gap-2 mb-2">
                    {w.subject && <span className="badge-blue text-[10px]">{w.subject}</span>}
                    <span className="text-[10px] text-slate-500">{new Date(w.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed mb-3">{w.question_text}</p>

                  {/* Şıklar (varsa) */}
                  {hasOptions && (
                    <div className="space-y-1.5 mb-3">
                      {opts.map((opt, i) => {
                        const letter = LETTERS[i];
                        const sel = selected[w.id] === letter;
                        const rev = revealed[w.id];
                        const correct = w.correct_answer === letter;
                        let cls = 'bg-[#0F172A] text-slate-400 hover:bg-[#253347]';
                        if (rev && w.correct_answer) {
                          if (correct) cls = 'bg-success/15 text-success border border-success/30';
                          else if (sel) cls = 'bg-red-500/15 text-red-400 border border-red-500/30';
                        } else if (sel) cls = 'bg-primary/15 text-primary-light';
                        return (
                          <button key={i} onClick={() => !rev && checkAnswer(w.id, w, letter)}
                            className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${cls}`}>
                            <span className="font-bold">{letter})</span>
                            <span>{String(opt).replace(/^[A-E]\)\s*/, '')}</span>
                            {rev && correct && <CheckCircle size={13} className="ml-auto flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* AI açıklaması */}
                  {w.explanation ? (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={12} className="text-primary-light" />
                        <span className="text-[11px] font-semibold text-primary-light">AI Açıklaması</span>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{w.explanation}</div>
                    </div>
                  ) : (
                    <button onClick={() => explainWithAI(w.id)} disabled={explaining === w.id}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-xs font-medium mb-3 hover:opacity-90 transition-opacity disabled:opacity-50">
                      {explaining === w.id ? <><Loader size={13} className="animate-spin" /> AI düşünüyor...</> : <><Sparkles size={13} /> AI'ya Sor — Bu Soruyu Açıkla</>}
                    </button>
                  )}

                  {/* Aksiyon butonları */}
                  <div className="flex gap-2">
                    {revealed[w.id] && hasOptions && (
                      <button onClick={() => { setRevealed(p => ({...p,[w.id]:false})); setSelected(p => {const n={...p};delete n[w.id];return n;}); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#253347] text-slate-300 text-xs">
                        <RotateCcw size={12} /> Tekrar Dene
                      </button>
                    )}
                    <button onClick={() => markSolved(w.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/15 text-success text-xs ml-auto">
                      <CheckCircle size={12} /> Öğrendim, Sil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MANUEL EKLEME MODALI */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full md:max-w-lg bg-[#1E293B] border border-white/[0.08] rounded-t-2xl md:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-bold">📸 Soru Ekle</div>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Kitaptan/testten çözemediğin soruyu fotoğrafla ya da elle yaz. AI okuyup açıklar.</p>

            {/* FOTOĞRAF — kamera + galeri ayrı */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {/* Kamera */}
              <label className={`cursor-pointer ${photoLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white hover:opacity-90 transition-opacity h-full justify-center">
                  {photoLoading ? <Loader size={24} className="animate-spin" /> : <Camera size={24} />}
                  <div className="text-center">
                    <div className="text-sm font-bold">Fotoğraf Çek</div>
                    <div className="text-[10px] opacity-90">Kamerayı aç</div>
                  </div>
                </div>
              </label>

              {/* Galeri */}
              <label className={`cursor-pointer ${photoLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#253347] border border-white/10 text-white hover:bg-[#2D3F56] transition-colors h-full justify-center">
                  {photoLoading ? <Loader size={24} className="animate-spin" /> : <ImageIcon size={24} className="text-primary-light" />}
                  <div className="text-center">
                    <div className="text-sm font-bold">Galeriden Seç</div>
                    <div className="text-[10px] text-slate-400">Mevcut fotoğraf</div>
                  </div>
                </div>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 text-center mb-4">📸 AI soruyu okur, deftere ekler. Önce sen dene, hazır olunca AI'ya sorarsın.</p>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-slate-600">veya elle yaz</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="space-y-3">
              {/* Ders */}
              <div>
                <div className="text-[11px] text-slate-500 mb-1.5">Ders</div>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setFSubject(s)} className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${fSubject === s ? 'bg-primary text-white' : 'bg-[#0F172A] text-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Soru metni */}
              <div>
                <div className="text-[11px] text-slate-500 mb-1.5">Soru *</div>
                <textarea value={fText} onChange={e => setFText(e.target.value)} placeholder="Soruyu buraya yaz..." rows={3}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary resize-none" />
              </div>

              {/* Şıklar */}
              <div>
                <div className="text-[11px] text-slate-500 mb-1.5">Şıklar (opsiyonel ama önerilir)</div>
                <div className="space-y-1.5">
                  {fOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button onClick={() => setFCorrect(LETTERS[i])}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${fCorrect === LETTERS[i] ? 'bg-success text-white' : 'bg-[#253347] text-slate-400'}`}
                        title="Doğru cevabı işaretle">
                        {LETTERS[i]}
                      </button>
                      <input value={opt} onChange={e => setFOptions(p => p.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={`${LETTERS[i]} şıkkı...`}
                        className="flex-1 bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">💡 Doğru cevabı işaretlemek için soldaki harfe tıkla {fCorrect && `(Seçili: ${fCorrect})`}</p>
              </div>

              <button onClick={addManual} disabled={saving}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-light text-white font-medium transition-colors disabled:opacity-50">
                {saving ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
