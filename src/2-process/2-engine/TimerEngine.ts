import type { TimerStore } from 'src/1-data/2-types/TimerModel';

interface TimerControllerOptions {
  readonly store: TimerStore;
}

export class TimerController {
  readonly #store: TimerStore;
  #elapsedTime = 0;
  #lastTimestamp: number | null = null;
  #animationFrameId: number | null = null;

  constructor({ store }: TimerControllerOptions) {
    this.#store = store;
  }

  #tick = (): void => {
    if (!this.#store.isRunning || this.#store.isPaused) {
      this.#lastTimestamp = null;
      return;
    }

    const now = performance.now();
    if (this.#lastTimestamp !== null) {
      const delta = now - this.#lastTimestamp;
      this.#elapsedTime += delta;
      this.#store.updateDisplay(this.#elapsedTime);
    }
    this.#lastTimestamp = now;

    this.#animationFrameId = requestAnimationFrame(this.#tick);
  };

  #cleanup = (): void => {
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
    this.#lastTimestamp = null;
  };

  start(): void {
    this.#store.start();
    this.#lastTimestamp = performance.now();
    this.#tick();
  }

  pause(): void {
    this.#store.pause();
    this.#cleanup();
  }

  resume(): void {
    this.#store.resume();
    this.#lastTimestamp = performance.now();
    this.#tick();
  }

  stop(): void {
    this.#store.stop();
    this.#cleanup();
  }

  reset(): void {
    this.stop();
    this.#elapsedTime = 0;
    this.#store.reset();
  }
}
