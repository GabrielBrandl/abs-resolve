import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'abs-theme';
const SIDEBAR_KEY = 'abs-sidebar-collapsed';

function readTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* ignore */
  }
  return 'light';
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

export function applyThemeClass(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

interface UiState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  sidebarCollapsed: readCollapsed(),

  setTheme: (theme) => {
    applyThemeClass(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setSidebarCollapsed: (collapsed) => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
    set({ sidebarCollapsed: collapsed });
  },

  toggleSidebar: () => {
    get().setSidebarCollapsed(!get().sidebarCollapsed);
  },
}));

/** Aplica tema salvo antes do primeiro paint do React */
applyThemeClass(readTheme());
