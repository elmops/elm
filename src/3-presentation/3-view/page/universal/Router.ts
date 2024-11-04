import { createRouter, createWebHistory } from 'vue-router';

// Lazy load components for better performance
const MeetingSetup = () =>
  import('src/3-presentation/3-view/page/individual/MeetingSetup.vue');
const Meeting = () =>
  import('src/3-presentation/3-view/page/individual/Meeting.vue');
const Landing = () =>
  import('src/3-presentation/3-view/page/individual/Landing.vue');
// TODO: move landing to page folder

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
