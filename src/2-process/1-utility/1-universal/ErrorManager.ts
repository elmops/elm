import { logger } from './Logging';

interface ErrorOptions {
  autoHandle?: boolean;
}

interface ErrorContext {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  options?: ErrorOptions;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  private readonly options: ErrorOptions;

  constructor(params: ErrorContext) {
    super(params.message);
    this.name = 'ApplicationError';
    this.code = params.code;
    this.context = params.context;
    this.options = { autoHandle: true, ...params.options };

    if (this.options.autoHandle) {
      ErrorManager.getInstance().notifyError(this);
    }
  }
}

export class ErrorManager {
  private static instance: ErrorManager;
  private errorHandlers: Set<(error: ApplicationError) => void> = new Set();

  private constructor() {
    window.addEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection.bind(this)
    );
    window.addEventListener('error', this.handleGlobalError.bind(this));
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.handleError(event.reason);
    event.preventDefault();
  }

  private handleGlobalError(event: ErrorEvent) {
    this.handleError(event.error);
    event.preventDefault();
  }

  notifyError(error: ApplicationError) {
    logger.error({
      code: error.code,
      message: error.message,
      context: error.context,
    });

    this.errorHandlers.forEach((handler) => handler(error));
  }

  handleError(
    error: unknown,
    context?: Record<string, unknown>
  ): ApplicationError {
    const appError = this.normalizeError(error, context);
    this.notifyError(appError);
    return appError;
  }

  subscribe(handler: (error: ApplicationError) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  private normalizeError(
    error: unknown,
    context?: Record<string, unknown>
  ): ApplicationError {
    if (error instanceof ApplicationError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApplicationError({
        code: 'UNKNOWN_ERROR',
        message: error.message,
        context: {
          ...context,
          originalError: error,
        },
      });
    }

    return new ApplicationError({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      context: {
        ...context,
        originalError: error,
      },
    });
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }
}

export const errorManager = ErrorManager.getInstance();
