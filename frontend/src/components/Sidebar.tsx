'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { LayoutDashboard, FileText, Bot, ClipboardList, CreditCard, Video, LogOut } from 'lucide-react';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/video', icon: Video, label: 'Video Merkezi' },
    { href: '/pdf', icon: FileText, label: 'PDF & Soru Üret' },
  { href: '/ai-tutor', icon: Bot, label: 'AI Öğretmen' },
  { href: '/quiz', icon: ClipboardList, label: 'Quiz' },
  { href: '/flashcard', icon: CreditCard, label: 'Flashcard' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 bg-[#1E293B] border-r border-white/[0.08] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-white/[0.08] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-base">🎯</div>
        <span className="font-bold text-sm">KPSS <span className="text-primary-light">Master AI</span></span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-primary/15 text-primary-light' : 'text-slate-400 hover:bg-[#253347] hover:text-white'}`}>
              {active && <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r" />}
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/[0.08]">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#253347] mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold">
            {user?.name?.slice(0,2).toUpperCase() || 'KM'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-500">⭐ {user?.xp || 0} XP</div>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={12} /> Çıkış
        </button>
      </div>
    </aside>
  );
}
