const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('toolbarAPI', {
  cancel: () => ipcRenderer.invoke('ehv:close-login-webview'),
})
