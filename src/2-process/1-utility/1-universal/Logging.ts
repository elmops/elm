import { ref } from 'vue';

const isDev = process.env.NODE_ENV === 'development';
const useDebugger = ref(false);

/**
 * This is a simple logger that mimics the console methods.
 * It also has a debugger statement that is only active in development mode.
 *
 * @returns {Object} An object with methods for logging.
 * @property {Function} log - Logs a message to the console.
 * @property {Function} error - Logs an error message to the console.
 * @property {Function} warn - Logs a warning message to the console.
 * @property {Function} debug - Logs a debug message to the console.
 * @property {Function} info - Logs an info message to the console.
 * @property {Function} setUseDebugger - Sets the useDebugger flag.
 * @property {Boolean} useDebugger - A boolean that determines if the debugger statement should be used.
 *
 * @example
 * logger.log('Hello, world!');
 * logger.setUseDebugger(true); // This will enable the debugger statement
 *
 */
export const logger = {
  /**
   * Logs a message to the console.
   * @param {...any[]} args - The arguments to log.
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  /**
   * Logs an error message to the console.
   * @param {...any[]} args - The arguments to log.
   */
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  /**
   * Logs a warning message to the console.
   * @param {...any[]} args - The arguments to log.
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  /**
   * Logs a debug message to the console.
   * @param {...any[]} args - The arguments to log.
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  /**
   * Logs an info message to the console.
   * @param {...any[]} args - The arguments to log.
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
      if (useDebugger.value) {
        /* biome-ignore lint/suspicious/noDebugger: Only used in development */
        debugger;
      }
    }
  },
  /**
   * Sets the useDebugger flag.
   * @param {boolean} value - The value to set the useDebugger flag to.
   */
  setUseDebugger: (value: boolean) => {
    useDebugger.value = value;
  },
};
