import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { generateDeviceKeyPair, getPublicKey, signChallenge, storePrivateKey, hasPrivateKey } from '../device/identity';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // In production, load the bundled React app HTML file
  // For development, point to the Vite dev server
  if (app.isPackaged) {
    // 🔴 TODO: Replace this URL with your actual deployed Vercel/Netlify URL
    const LIVE_APP_URL = 'https://your-bkm-attendance-app.vercel.app';
    mainWindow.loadURL(LIVE_APP_URL);
  } else {
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5174';
    mainWindow.loadURL(startUrl);
  }

  // Open DevTools in dev mode
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for Device Security

ipcMain.handle('device:isEnrolled', async () => {
  return await hasPrivateKey();
});

ipcMain.handle('device:enroll', async () => {
  try {
    const keyPair = await generateDeviceKeyPair();
    await storePrivateKey(keyPair.privateKey);
    return { success: true, publicKey: keyPair.publicKey };
  } catch (error: any) {
    console.error('Enrollment failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('device:getPublicKey', async () => {
  try {
    const pubKey = await getPublicKey();
    return { success: true, publicKey: pubKey };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('device:signChallenge', async (event, challenge: string) => {
  try {
    const signature = await signChallenge(challenge);
    return { success: true, signature };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
