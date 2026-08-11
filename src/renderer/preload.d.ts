import { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor';
import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      selectFile: () => Promise<string | null>;
      startSyncplay: (host: string, serverPass: string, username: string, room: string, playerPath: string, videoPath: string, enableGui: boolean) => Promise<boolean>;
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
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        getAll: () => Promise<Record<string, any>>;
      };
    };
  }
}

export {};
