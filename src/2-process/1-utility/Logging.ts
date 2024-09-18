import { ref } from 'vue';

const isDev = process.env.NODE_ENV === 'development';
const useDebugger = ref(false);

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  setUseDebugger: (value: boolean) => {
    useDebugger.value = value;
  },
};