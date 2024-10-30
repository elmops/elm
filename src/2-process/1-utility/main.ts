import { createApp } from 'vue';
import { createPinia } from 'pinia'

import App from '@view/page/universal/App.vue';
import '@view/style/universal/style.css';


const app = createApp(App)
app.use(createPinia())
app.mount('#app')
