import { createApp } from 'vue';
import { createPinia } from 'pinia'

import App from '@view/page/universal/App.vue';
import router from '@/3-presentation/3-view/page/universal/Router';
import '../../../node_modules/flowbite-vue/dist/index.css';
import '@view/style/universal/style.css';

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
