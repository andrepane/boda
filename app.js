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

const CATEGORY_OPTIONS = [
  { value: 'invitados', label: 'Invitados' },
  { value: 'decoracion', label: 'Decoración' },
  { value: 'catering', label: 'Catering' },
  { value: 'musica', label: 'Música' },
  { value: 'viaje', label: 'Viaje de novios' },
];

const FALLBACK_CATEGORY = { value: 'otros', label: 'Otros detalles' };
const ALL_CATEGORIES = [...CATEGORY_OPTIONS, FALLBACK_CATEGORY];

const PRIORITY_OPTIONS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

const PRIORITY_DEFAULT = 'media';

const PRIORITY_LABELS = PRIORITY_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label;
  return labels;
}, {});

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString();

const isValidCategory = (value) => ALL_CATEGORIES.some((option) => option.value === value);

const isValidPriority = (value) => PRIORITY_OPTIONS.some((option) => option.value === value);

const normalizeDueDate = (value) => {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));

  if (!year || !month || !day) {
    return '';
  }

  const date = new Date(year, month - 1, day);
  const isValid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  if (!isValid) {
    return '';
  }

  const normalizedMonth = String(month).padStart(2, '0');
  const normalizedDay = String(day).padStart(2, '0');

  return `${year}-${normalizedMonth}-${normalizedDay}`;
};

const normalizeTask = (task) => {
  if (!task || typeof task !== 'object') {
    return null;
  }

  const description = typeof task.description === 'string' ? task.description.trim() : '';
  if (!description) {
    return null;
  }

  const baseId =
    typeof task.id === 'string' && task.id
      ? task.id
      : typeof task.id === 'number'
      ? task.id.toString()
      : '';

  const id = baseId || createId();
  const category = isValidCategory(task.category) ? task.category : FALLBACK_CATEGORY.value;
  const priority = isValidPriority(task.priority) ? task.priority : PRIORITY_DEFAULT;
  const dueDate = normalizeDueDate(task.dueDate);

  return {
    id,
    description,
    category,
    priority,
    dueDate,
    completed: Boolean(task.completed),
  };
};

const formatDueDate = (value) => {
  const normalized = normalizeDueDate(value);

  if (!normalized) {
    return '';
  }

  const [year, month, day] = normalized.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(date);
};

const createTaskItem = (task) => {
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
  checkbox.setAttribute('aria-label', 'Marcar tarea como completada');

  const content = document.createElement('div');
  content.className = 'task__content';

  const title = document.createElement('p');
  title.className = 'task__label';
  title.textContent = task.description;

  const meta = document.createElement('div');
  meta.className = 'task__meta';

  const priorityTag = document.createElement('span');
  priorityTag.className = `task__priority priority--${task.priority}`;
  priorityTag.textContent = PRIORITY_LABELS[task.priority] || task.priority;
  meta.appendChild(priorityTag);

  const formattedDueDate = formatDueDate(task.dueDate);

  if (formattedDueDate) {
    const due = document.createElement('span');
    due.className = 'task__due';
    due.textContent = `Antes del ${formattedDueDate}`;
    meta.appendChild(due);
  }

  content.append(title);

  if (meta.childElementCount > 0) {
    content.append(meta);
  }

  const deleteButton = document.createElement('button');
  deleteButton.className = 'task__delete';
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', `Eliminar tarea: ${task.description}`);
  deleteButton.textContent = '×';

  item.append(checkbox, content, deleteButton);

  return item;
};

const STORAGE_KEY = 'wedding-checklist-tasks';
const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const categorySelect = document.getElementById('task-category');
const prioritySelect = document.getElementById('task-priority');
const deadlineInput = document.getElementById('task-deadline');
const list = document.getElementById('task-list');
const pendingCount = document.getElementById('pending-count');
const totalCount = document.getElementById('total-count');
const progressValue = document.getElementById('progress-value');
const progressFill = document.getElementById('progress-fill');
const progressBar = document.getElementById('progress-bar');

const loadTasks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((task) => normalizeTask(task))
      .filter((task) => task !== null);
  } catch (error) {
    console.warn('No se pudo cargar la checklist de localStorage.', error);
    return [];
  }
};

const saveTasks = (currentTasks) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTasks));
  } catch (error) {
    console.warn('No se pudo guardar la checklist en localStorage.', error);
  }
};

let tasks = loadTasks();

const renderTasks = () => {
  list.innerHTML = '';

  if (!tasks.length) {
    const emptyState = document.createElement('li');
    emptyState.className = 'task task--empty';

    const message = document.createElement('p');
    message.className = 'task__label';
    message.textContent = 'Añade tu primera tarea para comenzar.';

    emptyState.appendChild(message);
    list.appendChild(emptyState);
  } else {
    const fragment = document.createDocumentFragment();
    const grouped = tasks.reduce((accumulator, task) => {
      const category = task.category;

      if (!accumulator.has(category)) {
        accumulator.set(category, []);
      }

      accumulator.get(category).push(task);
      return accumulator;
    }, new Map());

    ALL_CATEGORIES.forEach((category) => {
      const categoryTasks = grouped.get(category.value);

      if (!categoryTasks || categoryTasks.length === 0) {
        return;
      }

      const groupItem = document.createElement('li');
      groupItem.className = 'task-group';
      groupItem.dataset.category = category.value;

      const header = document.createElement('div');
      header.className = 'task-group__header';

      const title = document.createElement('h3');
      title.className = 'task-group__title';
      title.textContent = category.label;

      const count = document.createElement('span');
      count.className = 'task-group__count';
      const taskCount = categoryTasks.length;
      count.textContent = `${taskCount} ${taskCount === 1 ? 'tarea' : 'tareas'}`;

      header.append(title, count);

      const groupList = document.createElement('ul');
      groupList.className = 'task-group__list';

      categoryTasks.forEach((task) => {
        groupList.appendChild(createTaskItem(task));
      });

      groupItem.append(header, groupList);
      fragment.appendChild(groupItem);
    });

    list.appendChild(fragment);
  }

  const total = tasks.length;
  const pending = tasks.filter((task) => !task.completed).length;
  const completed = total - pending;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  totalCount.textContent = String(total);
  pendingCount.textContent = String(pending);

  if (progressValue) {
    progressValue.textContent = `${progress}%`;
  }

  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', String(progress));
    progressBar.setAttribute('aria-valuetext', `${progress}% completado`);
  }

  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }
};

const addTask = ({ description, category, priority, dueDate }) => {
  const trimmedDescription = description.trim();

  if (!trimmedDescription) {
    return;
  }

  const normalizedCategory = isValidCategory(category)
    ? category
    : CATEGORY_OPTIONS[0].value;
  const normalizedPriority = isValidPriority(priority) ? priority : PRIORITY_DEFAULT;
  const normalizedDueDate = normalizeDueDate(dueDate);

  tasks = [
    {
      id: createId(),
      description: trimmedDescription,
      category: normalizedCategory,
      priority: normalizedPriority,
      dueDate: normalizedDueDate,
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

  addTask({
    description: input.value,
    category: categorySelect.value,
    priority: prioritySelect.value,
    dueDate: deadlineInput.value,
  });

  form.reset();
  categorySelect.value = CATEGORY_OPTIONS[0].value;
  prioritySelect.value = PRIORITY_DEFAULT;
  deadlineInput.value = '';
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


