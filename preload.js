// Sayfalar (YouTube Music, mini oynatıcı, ayarlar, istatistikler) ile ana işlem arasındaki köprü.
// Ana işlem her mesajın hangi pencereden geldiğini ayrıca kontrol eder.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ytmd', {
  // pencere tuşları
  minimize: () => ipcRenderer.send('ytmd-window', 'minimize'),
  maximize: () => ipcRenderer.send('ytmd-window', 'maximize'),
  close: () => ipcRenderer.send('ytmd-window', 'close'),
  fullscreen: (on) => ipcRenderer.send('ytmd-fullscreen', !!on),

  // YouTube Music sayfası
  update: (np) => ipcRenderer.send('ytmd-np', np),
  lyrics: (q) => ipcRenderer.invoke('ytmd-lyrics', q),
  share: (np) => ipcRenderer.invoke('ytmd-share', np),
  mini: () => ipcRenderer.send('ytmd-mini-toggle'),
  openSettings: () => ipcRenderer.send('ytmd-open-settings'),
  sleepDone: () => ipcRenderer.send('ytmd-sleep-done'),

  // mini oynatıcı
  onNowPlaying: (cb) => ipcRenderer.on('ytmd-np-push', (_e, d) => cb(d)),
  miniReady: () => ipcRenderer.send('ytmd-mini-ready'),
  control: (action, value) => ipcRenderer.send('ytmd-control', action, value),
  showMain: () => ipcRenderer.send('ytmd-show-main'),

  // ayarlar
  getSettings: () => ipcRenderer.invoke('ytmd-settings-get'),
  setSetting: (key, value) => ipcRenderer.send('ytmd-settings-set', key, value),
  getSleep: () => ipcRenderer.invoke('ytmd-sleep-get'),
  setSleep: (mode) => ipcRenderer.send('ytmd-sleep-set', mode),
  checkUpdates: () => ipcRenderer.invoke('ytmd-update-check'),

  // istatistikler
  getHistory: () => ipcRenderer.invoke('ytmd-history-get'),
  historyCount: () => ipcRenderer.invoke('ytmd-history-count'),
  clearHistory: () => ipcRenderer.invoke('ytmd-history-clear'),
  openStats: () => ipcRenderer.send('ytmd-open-stats'),
  playVideo: (id) => ipcRenderer.send('ytmd-play-video', id)
});
