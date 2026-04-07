const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listRepos: () => ipcRenderer.invoke('repos:list'),
  addRepo: (repo) => ipcRenderer.invoke('repos:add', repo),
  removeRepo: (repo) => ipcRenderer.invoke('repos:remove', repo),
  listRepoVariables: (repo) => ipcRenderer.invoke('repo:variables:list', repo),
  setRepoVariable: (repo, name, value) => ipcRenderer.invoke('repo:variables:set', repo, name, value),
  deleteRepoVariable: (repo, name) => ipcRenderer.invoke('repo:variables:delete', repo, name),
  listEnvironments: (repo) => ipcRenderer.invoke('env:list', repo),
  createEnvironment: (repo, envName) => ipcRenderer.invoke('env:create', repo, envName),
  listEnvironmentVariables: (repo, envName) => ipcRenderer.invoke('env:variables:list', repo, envName),
  setEnvironmentVariable: (repo, envName, name, value) => ipcRenderer.invoke('env:variables:set', repo, envName, name, value),
  deleteEnvironmentVariable: (repo, envName, name) => ipcRenderer.invoke('env:variables:delete', repo, envName, name)
});
