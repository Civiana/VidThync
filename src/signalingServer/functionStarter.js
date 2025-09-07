export const startServer = () => {
  window.require('electron').ipcRenderer.send('start-signaling-server');
};
