// Preload script — pont sécurisé entre le renderer et Node.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  // PDF → Word : conversion locale via pdf2docx
  convertPdfToWord: (pdfArrayBuffer) => ipcRenderer.invoke('pdf2word:convert', pdfArrayBuffer),
  checkPdf2Word: () => ipcRenderer.invoke('pdf2word:check'),
});
