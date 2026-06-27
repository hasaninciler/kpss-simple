'use client';
import { useState } from 'react';

const PLAYLISTS = [
  {
    id: 'PLPlLdubQ1fMsIk3Kujy9yqJOyFLHsfQlp',
    title: 'KPSS Coğrafya',
    icon: '🗺️',
    color: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    videos: [
      { id: 'QU_WmAy35PA', title: "Türkiye'nin Coğrafi Konumu" },
      { id: 'video2', title: "İklim Tipleri" },
      { id: 'video3', title: "Yüzey Şekilleri" },
    ]
  },
  {
    id: 'PL5w_hbb3voMm6DLBYyv0VZs9sKidbEpcg',
    title: 'KPSS Tarih',
    icon: '🏛️',
    color: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    videos: [
      { id: 'JiIDhhHGRJo', title: "Osmanlı Devleti Kuruluşu" },
      { id: 'video5', title: "Tanzimat Dönemi" },
      { id: 'video6', title: "Kurtuluş Savaşı" },
    ]
  },
  {
    id: 'PLPhEmM6X--Wf4b-wPQNtUqCIgomDotaIU',
    title: 'KPSS Matematik',
    icon: '📐',
    color: 'from-green-500/20 to-green-600/10',
    border: 'border-green-500/30',
    videos: [
      { id: 'xQm9ClQO7kQ', title: "Temel Matematik" },
      { id: 'video8', title: "Sayı Problemleri" },
      { id: 'video9', title: "Kesirler" },
    ]
  },
  {
    id: 'PLPlLdubQ1fMs-O0_vwxL7bH-S7Bi4jKsu',
    title: 'KPSS Türkçe',
    icon: '📝',
    color: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/30',
    videos: [
      { id: 'HUWNPYuCK4g', title: "Dil Bilgisi" },
      { id: 'video11', title: "Paragraf" },
      { id: 'video12', title: "Sözcük Türleri" },
    ]
  },
  {
    id: 'PL5w_hbb3voMmmxQhHqC_bmvVtzlDpXfA1',
    title: 'KPSS Vatandaşlık',
    icon: '⚖️',
    color: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/30',
    videos: [
      { id: 'rCF1jlILJhY', title: "Anayasa Hukuku" },
      { id: 'video14', title: "Temel Haklar" },
      { id: 'video15', title: "Yasama Yürütme Yargı" },
    ]
  },
];

export default function VideoPage() {
  const [activePlaylist, setActivePlaylist] = useState(PLAYLISTS[0]);
  const [activeVideo, setActiveVideo] = useState(PLAYLISTS[0].videos[0]);
  const [notes, setNotes] = useState('');

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">

      {/* Sol: Playlist listesi */}
      <div className="w-48 border-r border-white/[0.08] overflow-y-auto flex-shrink-0 p-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide px-2 py-2">Dersler</div>
        {PLAYLISTS.map(pl => (
          <button
            key={pl.id}
            onClick={() => { setActivePlaylist(pl); setActiveVideo(pl.videos[0]); }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${activePlaylist.id === pl.id ? 'bg-primary/15 text-primary-light' : 'text-slate-400 hover:bg-[#253347] hover:text-white'}`}
          >
            <span>{pl.icon}</span>
            <span className="truncate">{pl.title}</span>
          </button>
        ))}
      </div>

      {/* Orta: Video player */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Player */}
        <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-4">
          <iframe
            key={activeVideo.id}
            src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=0&rel=0`}
            title={activeVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Video başlık */}
        <h2 className="text-base font-semibold mb-1">{activeVideo.title}</h2>
        <p className="text-xs text-slate-500 mb-4">{activePlaylist.title} · KPSS 2026</p>

        {/* Notlar */}
        <div className="card">
          <div className="text-xs font-semibold text-slate-400 mb-2">📝 Video Notu</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Bu video hakkında not al..."
            rows={4}
            className="input resize-none"
          />
        </div>
      </div>

      {/* Sağ: Video listesi */}
      <div className="w-64 border-l border-white/[0.08] overflow-y-auto flex-shrink-0">
        <div className={`p-4 bg-gradient-to-br ${activePlaylist.color} border-b ${activePlaylist.border}`}>
          <div className="text-xl mb-1">{activePlaylist.icon}</div>
          <div className="text-sm font-semibold">{activePlaylist.title}</div>
          <div className="text-xs text-slate-400">{activePlaylist.videos.length} video</div>
        </div>

        <div className="p-2">
          {activePlaylist.videos.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActiveVideo(v)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all mb-1 ${activeVideo.id === v.id ? 'bg-primary/15 border border-primary/25' : 'hover:bg-[#253347]'}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${activeVideo.id === v.id ? 'bg-primary text-white' : 'bg-[#253347] text-slate-400'}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium leading-relaxed line-clamp-2">{v.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
