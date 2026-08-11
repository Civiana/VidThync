// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  syncthingFetch: (url: string, options?: Record<string, any>) =>
    ipcRenderer.invoke('syncthing:fetch', url, options),
  startSyncplay: (host: string, serverPass: string, username: string, room: string, playerPath: string, videoPath: string, enableGui: boolean) =>
    ipcRenderer.invoke('syncplay:start', host, serverPass, username, room, playerPath, videoPath, enableGui),
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
    getAll: () => ipcRenderer.invoke('store:getAll'),
  },
});

contextBridge.exposeInMainWorld('electron', electronHandler);
// preload.ts

export type ElectronHandler = typeof electronHandler;
