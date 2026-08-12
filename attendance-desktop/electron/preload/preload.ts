import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isEnrolled: () => ipcRenderer.invoke('device:isEnrolled'),
  enroll: () => ipcRenderer.invoke('device:enroll'),
  getPublicKey: () => ipcRenderer.invoke('device:getPublicKey'),
  signChallenge: (challenge: string) => ipcRenderer.invoke('device:signChallenge', challenge)
});
