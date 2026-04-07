const state = {
  repos: [],
  selectedRepo: '',
  environments: [],
  selectedEnvironment: ''
};

const repoInput = document.getElementById('repoInput');
const addRepoBtn = document.getElementById('addRepoBtn');
const repoList = document.getElementById('repoList');
const repoTitle = document.getElementById('repoTitle');
const repoVarName = document.getElementById('repoVarName');
const repoVarValue = document.getElementById('repoVarValue');
const saveRepoVarBtn = document.getElementById('saveRepoVarBtn');
const repoVarTable = document.getElementById('repoVarTable');
const envNameInput = document.getElementById('envNameInput');
const addEnvBtn = document.getElementById('addEnvBtn');
const envList = document.getElementById('envList');
const envTitle = document.getElementById('envTitle');
const envVarName = document.getElementById('envVarName');
const envVarValue = document.getElementById('envVarValue');
const saveEnvVarBtn = document.getElementById('saveEnvVarBtn');
const envVarTable = document.getElementById('envVarTable');
const message = document.getElementById('message');

function showMessage(text) {
  message.textContent = text;
  message.classList.add('show');
  setTimeout(() => message.classList.remove('show'), 1800);
}

function actionButton(label, style, onClick) {
  const button = document.createElement('button');
  button.textContent = label;
  if (style) {
    button.classList.add(style);
  }
  button.onclick = onClick;
  return button;
}

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
    if (repo === state.selectedRepo) {
      li.classList.add('selected');
    }

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

async function refreshRepoVariables() {
  repoVarTable.innerHTML = '';
  if (!state.selectedRepo) {
    repoTitle.textContent = 'Repository Variables';
    return;
  }
  repoTitle.textContent = `Repository Variables: ${state.selectedRepo}`;
  const vars = await window.api.listRepoVariables(state.selectedRepo);
  for (const item of vars) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.name}</td><td>${item.value ?? ''}</td>`;
    const actions = document.createElement('td');

    const editBtn = actionButton('Edit', 'secondary', () => {
      repoVarName.value = item.name;
      repoVarValue.value = item.value ?? '';
    });

    const deleteBtn = actionButton('Delete', 'danger', async () => {
      await window.api.deleteRepoVariable(state.selectedRepo, item.name);
      showMessage('Repository variable deleted');
      await refreshRepoVariables();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    tr.appendChild(actions);
    repoVarTable.appendChild(tr);
  }
}

async function refreshEnvironments() {
  envList.innerHTML = '';
  envVarTable.innerHTML = '';
  envTitle.textContent = 'Environment Variables';

  if (!state.selectedRepo) {
    state.environments = [];
    state.selectedEnvironment = '';
    return;
  }

  state.environments = await window.api.listEnvironments(state.selectedRepo);
  if (!state.environments.includes(state.selectedEnvironment)) {
    state.selectedEnvironment = state.environments[0] || '';
  }

  for (const env of state.environments) {
    const li = document.createElement('li');
    if (env === state.selectedEnvironment) {
      li.classList.add('selected');
    }

    const title = document.createElement('span');
    title.textContent = env;
    title.style.cursor = 'pointer';
    title.onclick = async () => {
      state.selectedEnvironment = env;
      await refreshEnvironmentVariables();
      renderRepos();
      await refreshEnvironments();
    };

    li.appendChild(title);
    envList.appendChild(li);
  }

  await refreshEnvironmentVariables();
}

async function refreshEnvironmentVariables() {
  envVarTable.innerHTML = '';
  if (!state.selectedRepo || !state.selectedEnvironment) {
    envTitle.textContent = 'Environment Variables';
    return;
  }

  envTitle.textContent = `Environment Variables: ${state.selectedEnvironment}`;
  const vars = await window.api.listEnvironmentVariables(state.selectedRepo, state.selectedEnvironment);

  for (const item of vars) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.name}</td><td>${item.value ?? ''}</td>`;
    const actions = document.createElement('td');

    const editBtn = actionButton('Edit', 'secondary', () => {
      envVarName.value = item.name;
      envVarValue.value = item.value ?? '';
    });

    const deleteBtn = actionButton('Delete', 'danger', async () => {
      await window.api.deleteEnvironmentVariable(state.selectedRepo, state.selectedEnvironment, item.name);
      showMessage('Environment variable deleted');
      await refreshEnvironmentVariables();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    tr.appendChild(actions);
    envVarTable.appendChild(tr);
  }
}

async function refreshRepoData() {
  await refreshRepoVariables();
  await refreshEnvironments();
}

addRepoBtn.onclick = async () => {
  if (!repoInput.value.trim()) {
    return;
  }
  await window.api.addRepo(repoInput.value);
  repoInput.value = '';
  showMessage('Repository added');
  await refreshRepos();
};

saveRepoVarBtn.onclick = async () => {
  if (!state.selectedRepo || !repoVarName.value.trim()) {
    return;
  }
  await window.api.setRepoVariable(state.selectedRepo, repoVarName.value.trim(), repoVarValue.value);
  repoVarName.value = '';
  repoVarValue.value = '';
  showMessage('Repository variable saved');
  await refreshRepoVariables();
};

addEnvBtn.onclick = async () => {
  if (!state.selectedRepo || !envNameInput.value.trim()) {
    return;
  }
  await window.api.createEnvironment(state.selectedRepo, envNameInput.value.trim());
  state.selectedEnvironment = envNameInput.value.trim();
  envNameInput.value = '';
  showMessage('Environment saved');
  await refreshEnvironments();
};

saveEnvVarBtn.onclick = async () => {
  if (!state.selectedRepo || !state.selectedEnvironment || !envVarName.value.trim()) {
    return;
  }
  await window.api.setEnvironmentVariable(
    state.selectedRepo,
    state.selectedEnvironment,
    envVarName.value.trim(),
    envVarValue.value
  );
  envVarName.value = '';
  envVarValue.value = '';
  showMessage('Environment variable saved');
  await refreshEnvironmentVariables();
};

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await refreshRepos();
  } catch (error) {
    showMessage(error.message);
  }
});
