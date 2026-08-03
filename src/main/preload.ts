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
  startServer: (port: string) =>
    ipcRenderer.send('start-signaling-server', port),
  syncthingFetch: (url: string, options?: Record<string, any>) =>
    ipcRenderer.invoke('syncthing:fetch', url, options),
  startSyncplay: () =>
    ipcRenderer.invoke("syncplay:start"),
  playPause: () => ipcRenderer.invoke("syncplay:play"),

  addVideo: (url: string) =>
    ipcRenderer.invoke("syncplay:addVideo", url),

  stopSyncplay: () =>
    ipcRenderer.invoke("syncplay:stop"),
});

contextBridge.exposeInMainWorld('electron', electronHandler);
// preload.ts

export type ElectronHandler = typeof electronHandler;
