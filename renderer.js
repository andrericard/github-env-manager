const state = {
  repos: [],
  selectedRepo: '',
  environments: [],
  selectedEnvironment: ''
};

const $ = (id) => document.getElementById(id);

const repoInput = $('repoInput');
const addRepoBtn = $('addRepoBtn');
const repoList = $('repoList');
const repoTitle = $('repoTitle');
const repoVarName = $('repoVarName');
const repoVarValue = $('repoVarValue');
const saveRepoVarBtn = $('saveRepoVarBtn');
const repoVarTable = $('repoVarTable');
const repoSecretName = $('repoSecretName');
const repoSecretValue = $('repoSecretValue');
const saveRepoSecretBtn = $('saveRepoSecretBtn');
const repoSecretTable = $('repoSecretTable');
const envList = $('envList');
const envTitle = $('envTitle');
const envVarName = $('envVarName');
const envVarValue = $('envVarValue');
const saveEnvVarBtn = $('saveEnvVarBtn');
const envVarTable = $('envVarTable');
const envSecretName = $('envSecretName');
const envSecretValue = $('envSecretValue');
const saveEnvSecretBtn = $('saveEnvSecretBtn');
const envSecretTable = $('envSecretTable');
const message = $('message');

// Tabs
document.querySelectorAll('.tabs').forEach((tabGroup) => {
  tabGroup.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => {
      const parent = tabGroup.parentElement;
      tabGroup.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      parent.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      parent.querySelector(`#${tab.dataset.tab}`).classList.add('active');
    };
  });
});

function showMessage(text) {
  message.textContent = text;
  message.classList.add('show');
  setTimeout(() => message.classList.remove('show'), 2500);
}

function actionButton(label, style, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  if (style) btn.classList.add(style);
  btn.onclick = onClick;
  return btn;
}

// --- Repos ---

async function refreshRepos() {
  state.repos = await window.api.listRepos();
  if (!state.repos.includes(state.selectedRepo)) {
    state.selectedRepo = state.repos[0] || '';
  }
  renderRepos();
  await refreshRepoData();
}

function renderRepos() {
  repoList.innerHTML = '';
  for (const repo of state.repos) {
    const li = document.createElement('li');
    if (repo === state.selectedRepo) li.classList.add('selected');

    const title = document.createElement('span');
    title.textContent = repo;
    title.style.cursor = 'pointer';
    title.onclick = async () => {
      state.selectedRepo = repo;
      state.selectedEnvironment = '';
      renderRepos();
      await refreshRepoData();
    };

    const removeBtn = actionButton('Remove', 'danger', async () => {
      await window.api.removeRepo(repo);
      showMessage('Repository removed');
      await refreshRepos();
    });

    li.appendChild(title);
    li.appendChild(removeBtn);
    repoList.appendChild(li);
  }
}

// --- Repo Variables ---

async function refreshRepoVariables() {
  repoVarTable.innerHTML = '';
  if (!state.selectedRepo) return;
  try {
    const vars = await window.api.listRepoVariables(state.selectedRepo);
    for (const item of vars) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.name}</td><td>${item.value ?? ''}</td>`;
      const actions = document.createElement('td');
      actions.appendChild(actionButton('Edit', 'secondary', () => {
        repoVarName.value = item.name;
        repoVarValue.value = item.value ?? '';
      }));
      actions.appendChild(actionButton('Delete', 'danger', async () => {
        await window.api.deleteRepoVariable(state.selectedRepo, item.name);
        showMessage('Variable deleted');
        await refreshRepoVariables();
      }));
      tr.appendChild(actions);
      repoVarTable.appendChild(tr);
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
}

// --- Repo Secrets ---

async function refreshRepoSecrets() {
  repoSecretTable.innerHTML = '';
  if (!state.selectedRepo) return;
  try {
    const secrets = await window.api.listRepoSecrets(state.selectedRepo);
    for (const item of secrets) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.name}</td>`;
      const actions = document.createElement('td');
      actions.appendChild(actionButton('Update', 'secondary', () => {
        repoSecretName.value = item.name;
        repoSecretValue.value = '';
        repoSecretValue.focus();
      }));
      actions.appendChild(actionButton('Delete', 'danger', async () => {
        await window.api.deleteRepoSecret(state.selectedRepo, item.name);
        showMessage('Secret deleted');
        await refreshRepoSecrets();
      }));
      tr.appendChild(actions);
      repoSecretTable.appendChild(tr);
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
}

// --- Environments ---

async function refreshEnvironments() {
  envList.innerHTML = '';
  envVarTable.innerHTML = '';
  envSecretTable.innerHTML = '';
  envTitle.textContent = 'Select an environment';

  if (!state.selectedRepo) {
    state.environments = [];
    state.selectedEnvironment = '';
    return;
  }

  try {
    state.environments = await window.api.listEnvironments(state.selectedRepo);
  } catch (error) {
    showMessage(`Error loading environments: ${error.message}`);
    state.environments = [];
    state.selectedEnvironment = '';
    return;
  }

  if (!state.environments.includes(state.selectedEnvironment)) {
    state.selectedEnvironment = state.environments[0] || '';
  }

  for (const env of state.environments) {
    const li = document.createElement('li');
    if (env === state.selectedEnvironment) li.classList.add('selected');

    const title = document.createElement('span');
    title.textContent = env;
    title.style.cursor = 'pointer';
    title.onclick = async () => {
      state.selectedEnvironment = env;
      renderEnvironmentList();
      await refreshEnvData();
    };

    li.appendChild(title);
    envList.appendChild(li);
  }

  await refreshEnvData();
}

function renderEnvironmentList() {
  envList.querySelectorAll('li').forEach((li) => {
    const name = li.querySelector('span').textContent;
    li.classList.toggle('selected', name === state.selectedEnvironment);
  });
}

// --- Env Variables ---

async function refreshEnvVariables() {
  envVarTable.innerHTML = '';
  if (!state.selectedRepo || !state.selectedEnvironment) {
    envTitle.textContent = 'Select an environment';
    return;
  }
  envTitle.textContent = state.selectedEnvironment;
  try {
    const vars = await window.api.listEnvVariables(state.selectedRepo, state.selectedEnvironment);
    for (const item of vars) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.name}</td><td>${item.value ?? ''}</td>`;
      const actions = document.createElement('td');
      actions.appendChild(actionButton('Edit', 'secondary', () => {
        envVarName.value = item.name;
        envVarValue.value = item.value ?? '';
      }));
      actions.appendChild(actionButton('Delete', 'danger', async () => {
        await window.api.deleteEnvVariable(state.selectedRepo, state.selectedEnvironment, item.name);
        showMessage('Variable deleted');
        await refreshEnvVariables();
      }));
      tr.appendChild(actions);
      envVarTable.appendChild(tr);
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
}

// --- Env Secrets ---

async function refreshEnvSecrets() {
  envSecretTable.innerHTML = '';
  if (!state.selectedRepo || !state.selectedEnvironment) return;
  try {
    const secrets = await window.api.listEnvSecrets(state.selectedRepo, state.selectedEnvironment);
    for (const item of secrets) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.name}</td>`;
      const actions = document.createElement('td');
      actions.appendChild(actionButton('Update', 'secondary', () => {
        envSecretName.value = item.name;
        envSecretValue.value = '';
        envSecretValue.focus();
      }));
      actions.appendChild(actionButton('Delete', 'danger', async () => {
        await window.api.deleteEnvSecret(state.selectedRepo, state.selectedEnvironment, item.name);
        showMessage('Secret deleted');
        await refreshEnvSecrets();
      }));
      tr.appendChild(actions);
      envSecretTable.appendChild(tr);
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
}

// --- Refresh helpers ---

async function refreshEnvData() {
  await refreshEnvVariables();
  await refreshEnvSecrets();
}

async function refreshRepoData() {
  repoTitle.textContent = state.selectedRepo ? `Repository: ${state.selectedRepo}` : 'Repository';
  await refreshRepoVariables();
  await refreshRepoSecrets();
  await refreshEnvironments();
}

// --- Button handlers ---

addRepoBtn.onclick = async () => {
  if (!repoInput.value.trim()) return;
  try {
    await window.api.addRepo(repoInput.value);
    repoInput.value = '';
    showMessage('Repository added');
    await refreshRepos();
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
};

saveRepoVarBtn.onclick = async () => {
  if (!state.selectedRepo || !repoVarName.value.trim()) return;
  try {
    await window.api.setRepoVariable(state.selectedRepo, repoVarName.value.trim(), repoVarValue.value);
    repoVarName.value = '';
    repoVarValue.value = '';
    showMessage('Variable saved');
    await refreshRepoVariables();
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
};

saveRepoSecretBtn.onclick = async () => {
  if (!state.selectedRepo || !repoSecretName.value.trim()) return;
  try {
    await window.api.setRepoSecret(state.selectedRepo, repoSecretName.value.trim(), repoSecretValue.value);
    repoSecretName.value = '';
    repoSecretValue.value = '';
    showMessage('Secret saved');
    await refreshRepoSecrets();
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
};

saveEnvVarBtn.onclick = async () => {
  if (!state.selectedRepo || !state.selectedEnvironment || !envVarName.value.trim()) return;
  try {
    await window.api.setEnvVariable(state.selectedRepo, state.selectedEnvironment, envVarName.value.trim(), envVarValue.value);
    envVarName.value = '';
    envVarValue.value = '';
    showMessage('Variable saved');
    await refreshEnvVariables();
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
};

saveEnvSecretBtn.onclick = async () => {
  if (!state.selectedRepo || !state.selectedEnvironment || !envSecretName.value.trim()) return;
  try {
    await window.api.setEnvSecret(state.selectedRepo, state.selectedEnvironment, envSecretName.value.trim(), envSecretValue.value);
    envSecretName.value = '';
    envSecretValue.value = '';
    showMessage('Secret saved');
    await refreshEnvSecrets();
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  $('appVersion').textContent = `v${window.appVersion}`;
  try {
    await refreshRepos();
  } catch (error) {
    showMessage(error.message);
  }
});
