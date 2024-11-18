import { createApp } from 'vue';
import { createPinia } from 'pinia';

import 'node_modules/flowbite-vue/dist/index.css';

import App from '@/3-presentation/1-universal/App.vue';
import '@/3-presentation/1-universal/style.css';

import router from '@/3-presentation/2-particular/Router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
