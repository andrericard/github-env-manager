const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const dataDir = app.getPath('userData');
const reposFile = path.join(dataDir, 'repos.json');

function ensureReposFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(reposFile)) {
    fs.writeFileSync(reposFile, JSON.stringify([]));
  }
}

function loadRepos() {
  ensureReposFile();
  return JSON.parse(fs.readFileSync(reposFile, 'utf-8'));
}

function saveRepos(repos) {
  ensureReposFile();
  fs.writeFileSync(reposFile, JSON.stringify(repos, null, 2));
}

function parseRepo(input) {
  const cleaned = input.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/^\//, '');
  const parts = cleaned.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Repository must be in owner/repo format');
  }
  return `${parts[0]}/${parts[1]}`;
}

function gh(args, stdinValue) {
  return new Promise((resolve, reject) => {
    const child = execFile('gh', args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
    if (stdinValue !== undefined) {
      child.stdin.write(stdinValue);
      child.stdin.end();
    }
  });
}

async function listRepoVariables(repo) {
  const output = await gh(['variable', 'list', '--repo', repo, '--json', 'name,value,visibility,updatedAt']);
  return output ? JSON.parse(output) : [];
}

async function listEnvironmentVariables(repo, env) {
  const pathValue = `repos/${repo}/environments/${encodeURIComponent(env)}/variables`;
  const output = await gh(['api', pathValue]);
  const parsed = JSON.parse(output || '{}');
  return parsed.variables || [];
}

async function listEnvironments(repo) {
  const output = await gh(['api', `repos/${repo}/environments`]);
  const parsed = JSON.parse(output || '{}');
  return (parsed.environments || []).map((env) => env.name);
}

function registerIpc() {
  ipcMain.handle('repos:list', () => loadRepos());

  ipcMain.handle('repos:add', (_, repoInput) => {
    const repo = parseRepo(repoInput);
    const repos = loadRepos();
    if (!repos.includes(repo)) {
      repos.push(repo);
      saveRepos(repos);
    }
    return repos;
  });

  ipcMain.handle('repos:remove', (_, repo) => {
    const repos = loadRepos().filter((item) => item !== repo);
    saveRepos(repos);
    return repos;
  });

  ipcMain.handle('repo:variables:list', async (_, repo) => listRepoVariables(repo));

  ipcMain.handle('repo:variables:set', async (_, repo, name, value) => {
    await gh(['variable', 'set', name, '--repo', repo], `${value}\n`);
    return listRepoVariables(repo);
  });

  ipcMain.handle('repo:variables:delete', async (_, repo, name) => {
    await gh(['variable', 'delete', name, '--repo', repo, '--yes']);
    return listRepoVariables(repo);
  });

  ipcMain.handle('env:list', async (_, repo) => listEnvironments(repo));

  ipcMain.handle('env:create', async (_, repo, envName) => {
    await gh(['api', '-X', 'PUT', `repos/${repo}/environments/${encodeURIComponent(envName)}`]);
    return listEnvironments(repo);
  });

  ipcMain.handle('env:variables:list', async (_, repo, envName) => listEnvironmentVariables(repo, envName));

  ipcMain.handle('env:variables:set', async (_, repo, envName, name, value) => {
    await gh(['api', '-X', 'PATCH', `repos/${repo}/environments/${encodeURIComponent(envName)}/variables/${name}`, '-f', `name=${name}`, '-f', `value=${value}`]);
    return listEnvironmentVariables(repo, envName);
  });

  ipcMain.handle('env:variables:delete', async (_, repo, envName, name) => {
    await gh(['api', '-X', 'DELETE', `repos/${repo}/environments/${encodeURIComponent(envName)}/variables/${name}`]);
    return listEnvironmentVariables(repo, envName);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
