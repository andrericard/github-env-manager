const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, execSync } = require('child_process');

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
  const trimmed = input.trim();
  const parts = trimmed.split('/');
  const owner = parts[parts.length - 2];
  const repo = parts[parts.length - 1];
  if (!owner || !repo) {
    throw new Error('Repository must be in owner/repo format');
  }
  return `${owner}/${repo}`;
}

let shellPath;
try {
  shellPath = execSync('bash -lc "echo $PATH"', { encoding: 'utf-8' }).trim();
} catch {
  shellPath = process.env.PATH || '';
}

const ghEnv = { ...process.env, PATH: shellPath };

function gh(args, stdinValue) {
  return new Promise((resolve, reject) => {
    const child = execFile('gh', args, { maxBuffer: 1024 * 1024 * 10, env: ghEnv }, (error, stdout, stderr) => {
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

// --- Variables (CLI) ---

async function listRepoVariables(repo) {
  const output = await gh(['variable', 'list', '--repo', repo, '--json', 'name,value']);
  return output ? JSON.parse(output) : [];
}

async function listEnvVariables(repo, env) {
  const output = await gh(['variable', 'list', '--repo', repo, '--env', env, '--json', 'name,value']);
  return output ? JSON.parse(output) : [];
}

// --- Secrets (CLI) ---

async function listRepoSecrets(repo) {
  const output = await gh(['secret', 'list', '--repo', repo, '--json', 'name']);
  return output ? JSON.parse(output) : [];
}

async function listEnvSecrets(repo, env) {
  const output = await gh(['secret', 'list', '--repo', repo, '--env', env, '--json', 'name']);
  return output ? JSON.parse(output) : [];
}

// --- Environments (API — gh CLI has no env command) ---

async function listEnvironments(repo) {
  const output = await gh(['api', `repos/${repo}/environments`, '--jq', '.environments[].name']);
  if (!output) return [];
  return output.split('\n').filter(Boolean);
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

  // Repo variables
  ipcMain.handle('repo:variables:list', async (_, repo) => listRepoVariables(repo));

  ipcMain.handle('repo:variables:set', async (_, repo, name, value) => {
    await gh(['variable', 'set', name, '--repo', repo, '--body', value]);
    return listRepoVariables(repo);
  });

  ipcMain.handle('repo:variables:delete', async (_, repo, name) => {
    await gh(['variable', 'delete', name, '--repo', repo, '--yes']);
    return listRepoVariables(repo);
  });

  // Repo secrets
  ipcMain.handle('repo:secrets:list', async (_, repo) => listRepoSecrets(repo));

  ipcMain.handle('repo:secrets:set', async (_, repo, name, value) => {
    await gh(['secret', 'set', name, '--repo', repo, '--body', value]);
    return listRepoSecrets(repo);
  });

  ipcMain.handle('repo:secrets:delete', async (_, repo, name) => {
    await gh(['secret', 'delete', name, '--repo', repo]);
    return listRepoSecrets(repo);
  });

  // Environments
  ipcMain.handle('env:list', async (_, repo) => listEnvironments(repo));

  // Env variables
  ipcMain.handle('env:variables:list', async (_, repo, envName) => listEnvVariables(repo, envName));

  ipcMain.handle('env:variables:set', async (_, repo, envName, name, value) => {
    await gh(['variable', 'set', name, '--repo', repo, '--env', envName, '--body', value]);
    return listEnvVariables(repo, envName);
  });

  ipcMain.handle('env:variables:delete', async (_, repo, envName, name) => {
    await gh(['variable', 'delete', name, '--repo', repo, '--env', envName, '--yes']);
    return listEnvVariables(repo, envName);
  });

  // Env secrets
  ipcMain.handle('env:secrets:list', async (_, repo, envName) => listEnvSecrets(repo, envName));

  ipcMain.handle('env:secrets:set', async (_, repo, envName, name, value) => {
    await gh(['secret', 'set', name, '--repo', repo, '--env', envName, '--body', value]);
    return listEnvSecrets(repo, envName);
  });

  ipcMain.handle('env:secrets:delete', async (_, repo, envName, name) => {
    await gh(['secret', 'delete', name, '--repo', repo, '--env', envName]);
    return listEnvSecrets(repo, envName);
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
