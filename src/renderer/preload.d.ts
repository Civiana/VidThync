import { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor';
import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      startServer: (port: string) => void;
      syncThingApiKey: string;
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
