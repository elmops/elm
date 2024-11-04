import { createApp } from 'vue';
import { createPinia } from 'pinia'

import App from 'src/3-presentation/3-view/page/universal/App.vue';
import router from 'src/3-presentation/3-view/page/universal/Router';
import 'node_modules/flowbite-vue/dist/index.css';
import 'src/3-presentation/3-view/style/universal/style.css';

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
