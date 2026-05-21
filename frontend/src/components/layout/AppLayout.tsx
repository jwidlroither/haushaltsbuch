import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV = [
  { to:'/',            icon:'◈', label:'Dashboard',     end:true },
  { to:'/transactions',icon:'⟐', label:'Transaktionen'           },
  { to:'/recurring',   icon:'↻', label:'Wiederkehrend'           },
  { to:'/goals',       icon:'🎯', label:'Sparziele'               },
  { to:'/categories',  icon:'◉', label:'Kategorien'              },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '?';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-raised)]">
      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={()=>setOpen(false)}/>}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-[var(--surface)] border-r border-[var(--border)]
        transform transition-transform duration-300 lg:translate-x-0
        ${open?'translate-x-0':'-translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white text-sm font-bold">H</span>
            </div>
            <div>
              <div className="font-display text-[var(--ink)] leading-tight">Haushaltsbuch</div>
              <div className="text-[10px] text-[var(--ink-faint)] uppercase tracking-widest">Finanzmanager</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={()=>setOpen(false)}
              className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)]
                text-sm transition-all duration-150
                ${isActive
                  ?'bg-[var(--accent-muted)] text-[var(--accent)] font-medium'
                  :'text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink)]'}`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[var(--border)] space-y-1">
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)]
              text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink)] transition-all">
            <span className="w-5 text-center">{theme==='dark'?'☀':'☽'}</span>
            <span>{theme==='dark'?'Heller Modus':'Dunkler Modus'}</span>
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)]
              text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink)] transition-all">
            <span className="w-5 text-center">→</span><span>Abmelden</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center
              text-white text-xs font-semibold shrink-0">{initials}</div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--ink)] truncate">{user?.name}</div>
              <div className="text-[10px] text-[var(--ink-faint)] truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3
          bg-[var(--surface)] border-b border-[var(--border)]">
          <button onClick={()=>setOpen(true)} className="p-2 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)]">☰</button>
          <span className="font-display text-[var(--ink)]">Haushaltsbuch</span>
          <button onClick={toggleTheme} className="p-2 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)]">
            {theme==='dark'?'☀':'☽'}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
