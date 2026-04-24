const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

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

// ─── PDF → WORD (local via pdf2docx) ──────────────────────────────────────────

// Trouve le chemin Python disponible sur le système
function findPython() {
  const candidates = process.platform === 'win32'
    ? ['python', 'python3', 'py']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      require('child_process').execFileSync(cmd, ['--version'], { stdio: 'pipe' });
      return cmd;
    } catch { /* pas trouvé, on essaie le suivant */ }
  }
  return null;
}

ipcMain.handle('pdf2word:convert', async (event, pdfArrayBuffer) => {
  const pythonCmd = findPython();
  if (!pythonCmd) {
    return { success: false, error: 'Python non trouvé. Installe Python 3 sur ton système.' };
  }

  // Écrire le PDF dans un fichier temporaire
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const tmpPdf = path.join(tmpDir, `pdf_toolkit_${timestamp}.pdf`);
  const tmpDocx = path.join(tmpDir, `pdf_toolkit_${timestamp}.docx`);
  const scriptPath = path.join(__dirname, 'convert_pdf2docx.py');

  try {
    // Écrire le buffer PDF dans un fichier temp
    fs.writeFileSync(tmpPdf, Buffer.from(pdfArrayBuffer));

    // Exécuter le script Python
    const result = await new Promise((resolve, reject) => {
      execFile(pythonCmd, [scriptPath, tmpPdf, tmpDocx], { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          // Code 2 = pdf2docx pas installé
          if (error.code === 2 || (stderr && stderr.includes('pdf2docx n\'est pas installé'))) {
            reject(new Error('pdf2docx n\'est pas installé. Exécute dans ton terminal :\npip install pdf2docx'));
          } else {
            reject(new Error(stderr || error.message));
          }
        } else {
          resolve(stdout.trim());
        }
      });
    });

    // Lire le fichier .docx généré
    const docxBuffer = fs.readFileSync(tmpDocx);

    // Nettoyer les fichiers temporaires
    try { fs.unlinkSync(tmpPdf); } catch {}
    try { fs.unlinkSync(tmpDocx); } catch {}

    return { success: true, data: docxBuffer.buffer };
  } catch (err) {
    // Nettoyer en cas d'erreur aussi
    try { fs.unlinkSync(tmpPdf); } catch {}
    try { fs.unlinkSync(tmpDocx); } catch {}
    return { success: false, error: err.message };
  }
});

// ─── Vérifier si pdf2docx est disponible ──────────────────────────────────────
ipcMain.handle('pdf2word:check', async () => {
  const pythonCmd = findPython();
  if (!pythonCmd) {
    return { available: false, reason: 'python_missing' };
  }

  try {
    await new Promise((resolve, reject) => {
      execFile(pythonCmd, ['-c', 'import pdf2docx; print(pdf2docx.__version__)'], { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      });
    });
    return { available: true };
  } catch {
    return { available: false, reason: 'pdf2docx_missing' };
  }
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
