import { createRouter, createWebHistory } from 'vue-router';

// Lazy load components for better performance
const MeetingSetup = () => import('@/3-presentation/3-view/MeetingSetup.vue');
const Meeting = () => import('@/3-presentation/3-view/Meeting.vue');
const Landing = () => import('@/3-presentation/3-view/Landing.vue');

const routes = [
  {
    path: '/',
    redirect: '/landing',
  },
  {
    path: '/landing',
    name: 'Landing',
    component: Landing,
    meta: {
      title: 'Join Meeting',
    },
  },
  {
    path: '/setup',
    name: 'MeetingSetup',
    component: MeetingSetup,
    meta: {
      title: 'Setup Meeting',
    },
  },
  {
    path: '/meeting',
    name: 'Meeting',
    component: Meeting,
    meta: {
      title: 'Meeting',
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _, next) => {
  document.title = (to.meta?.title as string) || 'Meeting App';
  next();
});

export default router;
