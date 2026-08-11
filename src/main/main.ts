/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
const StoreModule = require('electron-store');
const Store = typeof StoreModule === 'function' ? StoreModule : (StoreModule.default || StoreModule);
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { SyncplayManager } from "src/syncplay/SyncplayManager";

const syncplay = new SyncplayManager();
const store = new Store();

require('dotenv').config();

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:selectFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

// electron-store IPC handlers
ipcMain.handle('store:get', (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('store:set', (_event, key: string, value: any) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store:delete', (_event, key: string) => {
  store.delete(key);
  return true;
});

ipcMain.handle('store:getAll', () => {
  return store.store;
});

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  new AppUpdater();
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle Syncthing API requests from renderer
ipcMain.handle(
  'syncthing:fetch',
  async (event, url: string, options: Record<string, any> = {}) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      console.error('Syncthing fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      };
    }
  },
);

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

ipcMain.handle("syncplay:start", (_event, host: string, serverPass: string, username: string, room: string, playerPath: string, videoPath: string, enableGui: boolean ) => {
  console.log(`Starting Syncplay with host: ${host}, serverPass: ${serverPass}, username: ${username}, room: ${room}, playerPath: ${playerPath}, videoPath: ${videoPath}`, enableGui);
  return syncplay.start(
    host,
    serverPass,
    username,
    room,
    playerPath,
    videoPath,
    enableGui
  );
});

