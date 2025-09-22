const tabs = document.querySelectorAll('.tabs__tab');
const tabPanels = document.querySelectorAll('.tab-content');

const selectTab = (targetId) => {
  tabs.forEach((tab) => {
    const isTarget = tab.dataset.target === targetId;
    tab.classList.toggle('is-active', isTarget);
    tab.setAttribute('aria-selected', String(isTarget));
  });

  tabPanels.forEach((panel) => {
    const isTarget = panel.id === targetId;
    panel.classList.toggle('is-active', isTarget);
  });
};

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    selectTab(tab.dataset.target);
  });
});

const STORAGE_KEY = 'wedding-checklist-tasks';
const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');
const pendingCount = document.getElementById('pending-count');
const totalCount = document.getElementById('total-count');

const loadTasks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('No se pudo cargar la checklist de localStorage.', error);
    return [];
  }
};

const saveTasks = (tasks) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn('No se pudo guardar la checklist en localStorage.', error);
  }
};

let tasks = loadTasks();

const renderTasks = () => {
  list.innerHTML = '';

  if (!tasks.length) {
    const emptyState = document.createElement('li');
    emptyState.className = 'task';
    const message = document.createElement('p');
    message.className = 'task__label';
    message.textContent = 'A�ade tu primera tarea para comenzar.';
    emptyState.appendChild(message);
    list.appendChild(emptyState);
  } else {
    tasks.forEach((task) => {
      const item = document.createElement('li');
      item.className = 'task';
      if (task.completed) {
        item.classList.add('is-completed');
      }
      item.dataset.id = task.id;

      const checkbox = document.createElement('input');
      checkbox.className = 'task__checkbox';
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(task.completed);
      checkbox.setAttribute('aria-label', 'Marcar tarea');

      const label = document.createElement('p');
      label.className = 'task__label';
      label.textContent = task.description;

      const deleteButton = document.createElement('button');
      deleteButton.className = 'task__delete';
      deleteButton.type = 'button';
      deleteButton.setAttribute('aria-label', 'Eliminar tarea');
      deleteButton.textContent = '?';

      item.append(checkbox, label, deleteButton);
      list.appendChild(item);
    });
  }

  const total = tasks.length;
  const pending = tasks.filter((task) => !task.completed).length;
  totalCount.textContent = String(total);
  pendingCount.textContent = String(pending);
};

const addTask = (description) => {
  const trimmed = description.trim();
  if (!trimmed) {
    return;
  }

  tasks = [
    {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      description: trimmed,
      completed: false,
    },
    ...tasks,
  ];

  saveTasks(tasks);
  renderTasks();
};

const updateTask = (taskId, changes) => {
  tasks = tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task));
  saveTasks(tasks);
  renderTasks();
};

const deleteTask = (taskId) => {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks(tasks);
  renderTasks();
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  addTask(input.value);
  input.value = '';
  input.focus();
});

list.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.matches('.task__checkbox')) {
    return;
  }

  const item = target.closest('.task');
  if (!item) {
    return;
  }

  const taskId = item.dataset.id;
  if (taskId) {
    updateTask(taskId, { completed: target.checked });
  }
});

list.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.matches('.task__delete')) {
    return;
  }

  const item = target.closest('.task');
  if (!item) {
    return;
  }

  const taskId = item.dataset.id;
  if (taskId) {
    deleteTask(taskId);
  }
});

renderTasks();
selectTab('checklist');
