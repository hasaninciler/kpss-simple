'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { LayoutDashboard, CalendarDays, FileText, Bot, ClipboardList, CreditCard, Video, Trophy, BookOpen, BookX, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/plan',       icon: CalendarDays,     label: 'Günlük Plan' },
  { href: '/video',      icon: Video,            label: 'Video Merkezi' },
  { href: '/pdf',        icon: FileText,         label: 'Soru Üret' },
  { href: '/ai-tutor',   icon: Bot,              label: 'AI Öğretmen' },
  { href: '/quiz',       icon: ClipboardList,    label: 'Quiz' },
  { href: '/konular',    icon: BookOpen,         label: 'Konu Takibi' },
  { href: '/yanlislarim',icon: BookX,            label: 'Yanlışlarım' },
  { href: '/flashcard',  icon: CreditCard,       label: 'Flashcard' },
  { href: '/liderlik',   icon: Trophy,           label: 'Liderlik' },
];

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const level = Math.floor((user?.xp || 0) / 500) + 1;
  const levelXp = (user?.xp || 0) % 500;

  return (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-base">🎯</div>
          <span className="font-bold text-sm">KPSS <span className="text-primary-light">Master</span></span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-primary/15 text-primary-light' : 'text-slate-400 hover:bg-[#253347] hover:text-white'}`}>
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/[0.08]">
        <div className="p-2.5 rounded-xl bg-[#253347] mb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name?.slice(0,2).toUpperCase() || 'KM'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500">Lv.{level} · {user?.xp || 0} XP</div>
            </div>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
              style={{ width: `${(levelXp / 500) * 100}%` }} />
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={12} /> Çıkış
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 bg-[#1E293B] border-r border-white/[0.08] flex-col flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1E293B] border-b border-white/[0.08] flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm">🎯</div>
          <span className="font-bold text-sm">KPSS <span className="text-primary-light">Master</span></span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white p-1">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-[#1E293B] flex flex-col h-full shadow-2xl">
            <NavContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
