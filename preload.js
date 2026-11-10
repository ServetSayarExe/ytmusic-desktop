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
  installUpdate: () => ipcRenderer.send('ytmd-update-install'),
  sleepDone: () => ipcRenderer.send('ytmd-sleep-done'),
  pageSet: (key, value) => ipcRenderer.send('ytmd-page-set', key, value),
  recent: () => ipcRenderer.invoke('ytmd-recent'),
  coverData: (url) => ipcRenderer.invoke('ytmd-cover-data', url),
  copyImage: (dataUrl) => ipcRenderer.invoke('ytmd-copy-image', dataUrl),
  saveImage: (dataUrl, name) => ipcRenderer.invoke('ytmd-save-image', dataUrl, name),

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
  updateInfo: () => ipcRenderer.invoke('ytmd-update-info'),
  openReleases: () => ipcRenderer.send('ytmd-open-releases'),
  getDevices: () => ipcRenderer.invoke('ytmd-devices'),

  // istatistikler
  getHistory: () => ipcRenderer.invoke('ytmd-history-get'),
  historyCount: () => ipcRenderer.invoke('ytmd-history-count'),
  clearHistory: () => ipcRenderer.invoke('ytmd-history-clear'),
  openStats: () => ipcRenderer.send('ytmd-open-stats'),
  playVideo: (id) => ipcRenderer.send('ytmd-play-video', id),
  setGoal: (min) => ipcRenderer.send('ytmd-goal-set', min)
});
