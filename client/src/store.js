import { reactive } from 'vue';

export const store = reactive({
  user: null,
  theme: localStorage.getItem('theme') || 'auto',
  toasts: [],
  sidebarOpen: true,

  setUser(user) {
    this.user = user;
  },

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  },

  addToast(message, type = 'info', duration = 4000) {
    const id = Date.now() + Math.random();
    this.toasts.push({ id, message, type });
    setTimeout(() => this.removeToast(id), duration);
    return id;
  },

  removeToast(id) {
    const idx = this.toasts.findIndex(t => t.id === id);
    if (idx !== -1) this.toasts.splice(idx, 1);
  },

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  },
});

export function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    html.setAttribute('data-theme', theme);
  }
}

// Initialize theme on load
applyTheme(store.theme);

// Watch system preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (store.theme === 'auto') applyTheme('auto');
});
