'use client';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trash2, Zap, CreditCard, FileText, Loader } from 'lucide-react';

export default function PdfPage() {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);

  const load = () => api.get('/pdfs').then(r => setPdfs(r.data));
  useEffect(() => { load(); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        await api.post('/pdfs', form);
        toast.success(`${file.name} yüklendi`);
      }
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Yükleme başarısız');
    } finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxSize: 50 * 1024 * 1024,
  });

  const deletePdf = async (id: number) => {
    if (!confirm('Sil?')) return;
    await api.delete(`/pdfs/${id}`);
    toast.success('Silindi');
    load();
  };

  const generateQuestions = async (pdf: any) => {
    setGenerating(pdf.id);
    try {
      const { data } = await api.post('/ai/generate-questions', { pdfId: pdf.id, count: 10, difficulty: 'medium' });
      toast.success(`${data.count} soru üretildi!`);
    } catch { toast.error('Soru üretilemedi'); }
    finally { setGenerating(null); load(); }
  };

  const generateFlashcards = async (pdf: any) => {
    setGenerating(pdf.id);
    try {
      const { data } = await api.post('/ai/generate-flashcards', { pdfId: pdf.id, count: 10 });
      toast.success(`${data.count} flashcard üretildi!`);
    } catch { toast.error('Flashcard üretilemedi'); }
    finally { setGenerating(null); load(); }
  };

  const summarize = async (pdf: any) => {
    const t = toast.loading('Özet çıkarılıyor...');
    try {
      const { data } = await api.post(`/ai/summarize/${pdf.id}`);
      toast.success('Özet hazır', { id: t });
      load();
    } catch { toast.error('Hata', { id: t }); }
  };

  return (
    <div className="p-7 max-w-3xl">
      <h1 className="text-xl font-bold mb-6">📄 PDF Yükle & Soru Üret</h1>

      {/* Upload */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-8 ${isDragActive ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-primary/50 hover:bg-primary/5'}`}
      >
        <input {...getInputProps()} />
        {uploading
          ? <div className="flex flex-col items-center gap-2"><Loader size={32} className="animate-spin text-primary" /><span className="text-sm text-slate-400">Yükleniyor...</span></div>
          : <><div className="text-4xl mb-3">📤</div><p className="text-sm font-medium mb-1">{isDragActive ? 'Bırak!' : 'PDF sürükle veya tıkla'}</p><p className="text-xs text-slate-500">Maks. 50MB</p></>
        }
      </div>

      {/* PDF List */}
      <div className="space-y-3">
        {pdfs.map(pdf => (
          <div key={pdf.id} className="card flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{pdf.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {pdf.question_count} soru · {pdf.flashcard_count} kart
              </div>
              {pdf.ai_summary && (
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{pdf.ai_summary}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => generateQuestions(pdf)}
                disabled={generating === pdf.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary-light hover:bg-primary/25 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {generating === pdf.id ? <Loader size={11} className="animate-spin" /> : <Zap size={11} />}
                Soru Üret
              </button>
              <button
                onClick={() => generateFlashcards(pdf)}
                disabled={generating === pdf.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/15 text-purple-300 hover:bg-secondary/25 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <CreditCard size={11} /> Flashcard
              </button>
              {!pdf.ai_summary && (
                <button onClick={() => summarize(pdf)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#253347] text-slate-400 hover:text-white text-xs transition-colors">
                  📝 Özet
                </button>
              )}
              <button onClick={() => deletePdf(pdf.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-colors">
                <Trash2 size={11} /> Sil
              </button>
            </div>
          </div>
        ))}
        {pdfs.length === 0 && !uploading && (
          <div className="text-center py-12 text-slate-600">
            <FileText size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz PDF yok</p>
          </div>
        )}
      </div>
    </div>
  );
}
