'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const PLAYLISTS = [
  { id: 'PLPlLdubQ1fMsIk3Kujy9yqJOyFLHsfQlp', title: 'KPSS Coğrafya', icon: '🗺️', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20' },
  { id: 'PL5w_hbb3voMm6DLBYyv0VZs9sKidbEpcg', title: 'KPSS Tarih', icon: '🏛️', color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20' },
  { id: 'PLPhEmM6X--Wf4b-wPQNtUqCIgomDotaIU', title: 'KPSS Matematik', icon: '📐', color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/20' },
  { id: 'PLPlLdubQ1fMs-O0_vwxL7bH-S7Bi4jKsu', title: 'KPSS Türkçe', icon: '📝', color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20' },
  { id: 'PL5w_hbb3voMmmxQhHqC_bmvVtzlDpXfA1', title: 'KPSS Vatandaşlık', icon: '⚖️', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20' },
];

export default function VideoPage() {
  const [activePl, setActivePl] = useState(PLAYLISTS[0]);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  // Playlist değişince videoları çek
  useEffect(() => {
    setLoading(true);
    setError('');
    setVideos([]);
    setActiveVideo(null);

    api.get(`/youtube/playlist/${activePl.id}`)
      .then(r => {
        setVideos(r.data.videos);
        if (r.data.videos.length > 0) setActiveVideo(r.data.videos[0]);
      })
      .catch(e => setError(e.response?.data?.error || 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [activePl.id]);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">

      {/* Sol: Ders listesi */}
      <div className="w-44 border-r border-white/[0.08] overflow-y-auto flex-shrink-0 p-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide px-2 py-2">Dersler</div>
        {PLAYLISTS.map(pl => (
          <button key={pl.id} onClick={() => setActivePl(pl)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 text-left ${activePl.id === pl.id ? 'bg-primary/15 text-primary-light' : 'text-slate-400 hover:bg-[#253347] hover:text-white'}`}>
            <span className="text-base">{pl.icon}</span>
            <span className="truncate text-xs">{pl.title.replace('KPSS ', '')}</span>
          </button>
        ))}
      </div>

      {/* Orta: Player */}
      <div className="flex-1 overflow-y-auto p-5 min-w-0">
        {/* Player */}
        <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-4 w-full">
          {activeVideo ? (
            <iframe
              key={activeVideo.id}
              src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=0&rel=0&modestbranding=1`}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              {loading ? (
                <div className="text-center">
                  <div className="text-3xl mb-2 animate-pulse">🎬</div>
                  <div className="text-sm">Yükleniyor...</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-3xl mb-2">▶️</div>
                  <div className="text-sm">Video seç</div>
                </div>
              )}
            </div>
          )}
        </div>

        {activeVideo && (
          <>
            <h2 className="text-sm font-semibold mb-1 leading-relaxed">{activeVideo.title}</h2>
            <p className="text-xs text-slate-500 mb-4">{activePl.title} · {videos.length} video</p>
          </>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* Not al */}
        <div className="card">
          <div className="text-xs font-semibold text-slate-400 mb-2">📝 Video Notu</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Bu video hakkında not al..."
            rows={3}
            className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary transition-colors resize-none"
          />
        </div>
      </div>

      {/* Sağ: Video listesi */}
      <div className="w-64 border-l border-white/[0.08] overflow-y-auto flex-shrink-0">
        {/* Playlist header */}
        <div className={`p-4 bg-gradient-to-br ${activePl.color} border-b ${activePl.border} sticky top-0`}>
          <div className="text-xl mb-0.5">{activePl.icon}</div>
          <div className="text-sm font-semibold">{activePl.title}</div>
          <div className="text-xs text-slate-400">
            {loading ? 'Yükleniyor...' : `${videos.length} video`}
          </div>
        </div>

        {/* Video listesi */}
        <div className="p-2">
          {loading && (
            <div className="space-y-2 p-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-16 h-10 rounded bg-[#253347] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-[#253347] rounded w-full" />
                    <div className="h-2 bg-[#253347] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && videos.map((v, i) => (
            <button key={v.id} onClick={() => setActiveVideo(v)}
              className={`w-full flex items-start gap-2 p-2 rounded-xl text-left transition-all mb-1 ${activeVideo?.id === v.id ? 'bg-primary/15 border border-primary/25' : 'hover:bg-[#253347]'}`}>
              {/* Thumbnail */}
              <div className="relative flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden bg-[#253347]">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">{i+1}</div>
                )}
                {activeVideo?.id === v.id && (
                  <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
                    <span className="text-white text-xs">▶</span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium leading-relaxed line-clamp-2 text-left">
                  {v.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">#{i + 1}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
