const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agent", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  testPrint: () => ipcRenderer.invoke("test-print"),
  onStatus: (callback) => ipcRenderer.on("status", (_event, data) => callback(data))
});
