const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  
  // System notifications
  notify: ({ title, body }) => ipcRenderer.invoke('notify', { title, body }),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  
  // Database and log APIs
  getFiles: () => ipcRenderer.invoke('db:getFiles'),
  uploadFile: (file) => ipcRenderer.invoke('db:uploadFile', file),
  parseFile: (args) => ipcRenderer.invoke('db:parseFile', args),
  getLogEntries: (args) => ipcRenderer.invoke('db:getLogEntries', args),
  deleteFile: (args) => ipcRenderer.invoke('db:deleteFile', args),
  
  // Message file APIs
  readMessageFile: (filename) => ipcRenderer.invoke('readMessageFile', filename),
  
  // Listen for file selection from main process
  onFileSelected: (callback) => {
    ipcRenderer.on('file-selected', (event, filePath) => callback(filePath));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Platform info
  platform: process.platform
}); 