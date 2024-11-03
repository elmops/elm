import { createRouter, createWebHistory } from 'vue-router'

// Lazy load components for better performance
const MeetingSetup = () => import('@view/page/individual/MeetingSetup.vue')
const Meeting = () => import('@view/page/individual/Meeting.vue')

const routes = [
  {
    path: '/',
    redirect: '/setup'
  },
  {
    path: '/setup',
    name: 'MeetingSetup',
    component: MeetingSetup,
    meta: {
      title: 'Setup Meeting'
    }
  },
  {
    path: '/meeting',
    name: 'Meeting',
    component: Meeting,
    meta: {
      title: 'Meeting'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = (to.meta?.title as string) || 'Meeting App'
  next()
})

export default router 