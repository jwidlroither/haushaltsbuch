import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV = [
  { to:'/',             icon:'▦',  label:'Dashboard',    end:true  },
  { to:'/transactions', icon:'↕',  label:'Transaktionen'           },
  { to:'/recurring',    icon:'⟳',  label:'Wiederkehrend'           },
  { to:'/goals',        icon:'◎',  label:'Sparziele'               },
  { to:'/categories',   icon:'⊞',  label:'Kategorien'              },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '?';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-raised)]">
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col
        bg-[var(--surface)] border-r border-[var(--border)]
        transform transition-transform duration-300 ease-out lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold font-display">H</span>
            </div>
            <div>
              <div className="font-display font-bold text-[var(--ink)] text-sm leading-tight tracking-tight">
                Haushaltsbuch
              </div>
              <div className="text-[10px] text-[var(--ink-faint)] uppercase tracking-widest mt-0.5">
                Finanzmanager
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)]
                 text-sm transition-all duration-150 font-medium
                 ${isActive
                   ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                   : 'text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink)]'
                 }`
              }>
              <span className="text-sm w-4 text-center shrink-0 opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[var(--border)] space-y-0.5">
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)]
              text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink)]
              transition-all font-medium">
            <span className="text-sm w-4 text-center shrink-0">
              {theme === 'dark' ? '☀' : '☽'}
            </span>
            <span>{theme === 'dark' ? 'Hell' : 'Dunkel'}</span>
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)]
              text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--ink)]
              transition-all font-medium">
            <span className="text-sm w-4 text-center shrink-0">↩</span>
            <span>Abmelden</span>
          </button>

          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-[var(--radius-sm)]
            bg-[var(--surface-overlay)]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-orange-400
              flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--ink)] truncate">{user?.name}</div>
              <div className="text-[10px] text-[var(--ink-faint)] truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3
          bg-[var(--surface)] border-b border-[var(--border)] shrink-0">
          <button onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] transition-colors">
            ☰
          </button>
          <span className="font-display font-bold text-[var(--ink)] text-sm">Haushaltsbuch</span>
          <button onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] transition-colors">
            {theme === 'dark' ? '☀' : '☽'}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
