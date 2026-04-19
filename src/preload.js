// Preload script — pont sécurisé entre le renderer et Node.js
// Pour l'instant minimal, mais permet d'ajouter des APIs natives plus tard
// (ex: sauvegarder directement sur le disque via dialog.showSaveDialog)

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true
});
