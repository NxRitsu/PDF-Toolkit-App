const { app, BrowserWindow, Menu, ipcMain } = require('electron');
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
    show: false,
    autoHideMenuBar: true
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

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

// Vérifie si pdf2docx est importable
function checkPdf2docxInstalled(pythonCmd) {
  return new Promise((resolve) => {
    execFile(pythonCmd, ['-c', 'import pdf2docx'], { timeout: 10000 }, (error) => {
      resolve(!error);
    });
  });
}

// Installe pdf2docx silencieusement via pip
function installPdf2docx(pythonCmd) {
  return new Promise((resolve, reject) => {
    // On utilise --user pour éviter les problèmes de permissions
    // et --quiet pour ne rien afficher
    execFile(pythonCmd, ['-m', 'pip', 'install', '--user', '--quiet', 'pdf2docx'], {
      timeout: 120000, // 2 min max pour l'installation
    }, (error, stdout, stderr) => {
      if (error) {
        // Retry sans --user (certains environnements ne le supportent pas)
        execFile(pythonCmd, ['-m', 'pip', 'install', '--quiet', 'pdf2docx'], {
          timeout: 120000,
        }, (error2, stdout2, stderr2) => {
          if (error2) reject(new Error(stderr2 || stderr || error2.message));
          else resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

// S'assure que pdf2docx est prêt — installe silencieusement si besoin
// Retourne : { ready: true } ou { ready: false, reason: string }
let _pdf2docxState = null; // cache pour éviter de vérifier à chaque appel
async function ensurePdf2docx() {
  // Si déjà vérifié et OK, pas besoin de re-checker
  if (_pdf2docxState?.ready) return _pdf2docxState;

  const pythonCmd = findPython();
  if (!pythonCmd) {
    _pdf2docxState = { ready: false, reason: 'python_missing' };
    return _pdf2docxState;
  }

  // Vérifier si pdf2docx est déjà installé
  const installed = await checkPdf2docxInstalled(pythonCmd);
  if (installed) {
    _pdf2docxState = { ready: true, pythonCmd };
    return _pdf2docxState;
  }

  // Pas installé → installation silencieuse
  try {
    await installPdf2docx(pythonCmd);
    // Vérifier que l'install a fonctionné
    const nowInstalled = await checkPdf2docxInstalled(pythonCmd);
    if (nowInstalled) {
      _pdf2docxState = { ready: true, pythonCmd };
    } else {
      _pdf2docxState = { ready: false, reason: 'install_failed' };
    }
  } catch (err) {
    _pdf2docxState = { ready: false, reason: 'install_failed', error: err.message };
  }

  return _pdf2docxState;
}

// ─── IPC : vérifier la disponibilité ──────────────────────────────────────────
ipcMain.handle('pdf2word:check', async () => {
  const state = await ensurePdf2docx();
  return { available: state.ready, reason: state.reason || null };
});

// ─── IPC : convertir un PDF en Word ───────────────────────────────────────────
ipcMain.handle('pdf2word:convert', async (event, pdfArrayBuffer) => {
  // S'assurer que tout est prêt (installe si nécessaire)
  const state = await ensurePdf2docx();
  if (!state.ready) {
    if (state.reason === 'python_missing') {
      return { success: false, error: 'Python 3 est requis pour cette fonctionnalité.' };
    }
    return { success: false, error: 'La préparation du module de conversion a échoué.' };
  }

  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const tmpPdf = path.join(tmpDir, `pdf_toolkit_${timestamp}.pdf`);
  const tmpDocx = path.join(tmpDir, `pdf_toolkit_${timestamp}.docx`);
  const scriptPath = path.join(__dirname, 'convert_pdf2docx.py');

  try {
    fs.writeFileSync(tmpPdf, Buffer.from(pdfArrayBuffer));

    await new Promise((resolve, reject) => {
      execFile(state.pythonCmd, [scriptPath, tmpPdf, tmpDocx], { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve(stdout.trim());
      });
    });

    const docxBuffer = fs.readFileSync(tmpDocx);

    try { fs.unlinkSync(tmpPdf); } catch {}
    try { fs.unlinkSync(tmpDocx); } catch {}

    return { success: true, data: docxBuffer.buffer };
  } catch (err) {
    try { fs.unlinkSync(tmpPdf); } catch {}
    try { fs.unlinkSync(tmpDocx); } catch {}
    return { success: false, error: err.message };
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
