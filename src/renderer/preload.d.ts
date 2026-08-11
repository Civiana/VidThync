import { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor';
import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      startServer: (port: string) => void;
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
    };
  }
}

export {};
