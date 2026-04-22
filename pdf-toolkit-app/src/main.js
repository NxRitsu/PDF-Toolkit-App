const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Désactiver le menu par défaut d'Electron en production
if (process.env.NODE_ENV !== 'development') {
  Menu.setApplicationMenu(null);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 500,
    minHeight: 600,
    title: 'PDF Toolkit',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#020c1b',
    show: false, // on attend que la fenêtre soit prête
    autoHideMenuBar: true
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // Afficher la fenêtre quand le contenu est prêt (évite le flash blanc)
  win.once('ready-to-show', () => {
    win.show();
  });

  // Ouvrir les liens externes dans le navigateur par défaut
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
