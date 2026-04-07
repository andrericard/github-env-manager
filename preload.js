const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appVersion', ipcRenderer.sendSync('app:version'));

contextBridge.exposeInMainWorld('api', {
  listRepos: () => ipcRenderer.invoke('repos:list'),
  addRepo: (repo) => ipcRenderer.invoke('repos:add', repo),
  removeRepo: (repo) => ipcRenderer.invoke('repos:remove', repo),

  listRepoVariables: (repo) => ipcRenderer.invoke('repo:variables:list', repo),
  setRepoVariable: (repo, name, value) => ipcRenderer.invoke('repo:variables:set', repo, name, value),
  deleteRepoVariable: (repo, name) => ipcRenderer.invoke('repo:variables:delete', repo, name),

  listRepoSecrets: (repo) => ipcRenderer.invoke('repo:secrets:list', repo),
  setRepoSecret: (repo, name, value) => ipcRenderer.invoke('repo:secrets:set', repo, name, value),
  deleteRepoSecret: (repo, name) => ipcRenderer.invoke('repo:secrets:delete', repo, name),

  listEnvironments: (repo) => ipcRenderer.invoke('env:list', repo),

  listEnvVariables: (repo, envName) => ipcRenderer.invoke('env:variables:list', repo, envName),
  setEnvVariable: (repo, envName, name, value) => ipcRenderer.invoke('env:variables:set', repo, envName, name, value),
  deleteEnvVariable: (repo, envName, name) => ipcRenderer.invoke('env:variables:delete', repo, envName, name),

  listEnvSecrets: (repo, envName) => ipcRenderer.invoke('env:secrets:list', repo, envName),
  setEnvSecret: (repo, envName, name, value) => ipcRenderer.invoke('env:secrets:set', repo, envName, name, value),
  deleteEnvSecret: (repo, envName, name) => ipcRenderer.invoke('env:secrets:delete', repo, envName, name)
});
