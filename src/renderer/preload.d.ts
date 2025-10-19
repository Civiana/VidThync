import { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor';
import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      startServer: () => void;
      syncthingFetch: (
        url: string,
        options?: RequestInit,
      ) => Promise<{
        success: boolean;
        data?: any;
        status: number;
        error?: string;
      }>;
    };
  }
}

export {};
