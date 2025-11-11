// Preload script for Electron
// This file runs in a context that has access to both the DOM and Node.js APIs
// but with limited access for security

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the API endpoint
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any Electron-specific APIs here if needed in the future
  platform: process.platform
});

