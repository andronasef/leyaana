// Periodic Background Sync is Chromium-only and not in TypeScript's DOM lib.
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  getTags(): Promise<string[]>;
  unregister(tag: string): Promise<void>;
}

interface ServiceWorkerRegistration {
  readonly periodicSync?: PeriodicSyncManager;
}
