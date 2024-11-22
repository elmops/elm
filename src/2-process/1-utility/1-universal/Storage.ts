import { ApplicationError } from '@/2-process/1-utility/1-universal/ErrorManager';

// TODO: Consider migrating to IndexedDB for better performance with large datasets
// For now, localStorage is sufficient for our small identity object
export async function set(key: string, value: unknown): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new ApplicationError({
      code: 'STORAGE_SAVE_ERROR',
      message: `Failed to save to storage: ${key}`,
      context: { key, value, error },
    });
  }
}

export async function get<T>(key: string): Promise<T | null> {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    throw new ApplicationError({
      code: 'STORAGE_LOAD_ERROR',
      message: `Failed to load from storage: ${key}`,
      context: { key, error },
    });
  }
}

export async function remove(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    throw new ApplicationError({
      code: 'STORAGE_REMOVE_ERROR',
      message: `Failed to remove from storage: ${key}`,
      context: { key, error },
    });
  }
}
