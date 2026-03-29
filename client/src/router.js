import { createRouter, createWebHistory } from 'vue-router';
import { store } from './store';
import { auth } from './api';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('./pages/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('./pages/Dashboard.vue'),
  },
  {
    path: '/leads',
    name: 'Leads',
    component: () => import('./pages/Leads.vue'),
  },
  {
    path: '/leads/:id',
    name: 'LeadProfile',
    component: () => import('./pages/LeadProfile.vue'),
  },
  {
    path: '/leads/:id/report',
    name: 'ResearchReport',
    component: () => import('./pages/ResearchReport.vue'),
  },
  {
    path: '/communications',
    name: 'Communications',
    component: () => import('./pages/Communications.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./pages/Settings.vue'),
  },
  {
    path: '/archives',
    name: 'Archives',
    component: () => import('./pages/Archives.vue'),
  },
  {
    path: '/activity',
    name: 'AllActivity',
    component: () => import('./pages/AllActivity.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

let authChecked = false;

router.beforeEach(async (to, from, next) => {
  if (to.meta.public) return next();

  if (!authChecked) {
    try {
      const res = await auth.me();
      store.setUser(res.data.user);
    } catch {
      store.setUser(null);
    }
    authChecked = true;
  }

  if (!store.user) {
    return next('/login');
  }

  next();
});

export default router;
