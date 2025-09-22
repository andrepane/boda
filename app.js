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
  { value: 'decoracion', label: 'Decoración' },
  { value: 'papeleo', label: 'Papeleo' },
  { value: 'catering', label: 'Catering' },
  { value: 'viaje-de-novios', label: 'Viaje de novios' },
  { value: 'anillos', label: 'Anillos' },
  { value: 'vestimenta', label: 'Vestimenta' },
  { value: 'invitados', label: 'Invitados' },
  { value: 'otro', label: 'Otro' },
];

const FALLBACK_CATEGORY = CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
const ALL_CATEGORIES = CATEGORY_OPTIONS;

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

const toTimestamp = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (typeof value.seconds === 'number') {
      const milliseconds = value.seconds * 1000;
      const additional =
        typeof value.nanoseconds === 'number'
          ? Math.floor(value.nanoseconds / 1_000_000)
          : 0;

      return milliseconds + additional;
    }
  }

  return null;
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

  const createdAt = toTimestamp(task.createdAt);
  const updatedAt = toTimestamp(task.updatedAt);

  return {
    id,
    description,
    category,
    priority,
    dueDate,
    completed: Boolean(task.completed),
    createdAt: createdAt ?? null,
    updatedAt: updatedAt ?? null,
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

const sortTasks = (items) =>
  [...items].sort((first, second) => {
    const firstTime = typeof first.createdAt === 'number' ? first.createdAt : 0;
    const secondTime = typeof second.createdAt === 'number' ? second.createdAt : 0;

    return secondTime - firstTime;
  });

const buildRemoteChanges = (changes) => {
  const payload = {};

  if (typeof changes.description === 'string') {
    const trimmed = changes.description.trim();

    if (trimmed) {
      payload.description = trimmed;
    }
  }

  if (typeof changes.category === 'string' && isValidCategory(changes.category)) {
    payload.category = changes.category;
  }

  if (typeof changes.priority === 'string' && isValidPriority(changes.priority)) {
    payload.priority = changes.priority;
  }

  if ('dueDate' in changes) {
    payload.dueDate = normalizeDueDate(changes.dueDate);
  }

  if ('completed' in changes) {
    payload.completed = Boolean(changes.completed);
  }

  if (typeof changes.createdAt === 'number' && Number.isFinite(changes.createdAt)) {
    payload.createdAt = changes.createdAt;
  }

  return payload;
};

const toRemoteTaskRecord = (task) => ({
  description: task.description,
  category: task.category,
  priority: task.priority,
  dueDate: task.dueDate || '',
  completed: Boolean(task.completed),
  createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now(),
  updatedAt: typeof task.updatedAt === 'number' ? task.updatedAt : Date.now(),
});

const tryInitializeRemote = async ({ onTasks, getLocalTasks }) => {
  const config = typeof window !== 'undefined' ? window.firebaseConfig : null;

  const hasValidConfig = (value) => {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const requiredKeys = ['apiKey', 'projectId', 'appId'];

    return requiredKeys.every((key) => typeof value[key] === 'string' && value[key]);
  };

  if (!hasValidConfig(config)) {
    return null;
  }

  try {
    const [{ initializeApp }, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
    ]);

    const { getFirestore, collection, onSnapshot, setDoc, doc, updateDoc, deleteDoc, getDocs } =
      firestore;

    const app = initializeApp(config);
    const db = getFirestore(app);
    const tasksCollection = collection(db, 'tasks');

    const initialSnapshot = await getDocs(tasksCollection);

    if (initialSnapshot.empty) {
      const localTasks = getLocalTasks();

      if (localTasks.length) {
        await Promise.all(
          localTasks.map((task) => setDoc(doc(tasksCollection, task.id), toRemoteTaskRecord(task))),
        );
      }
    }

    const unsubscribe = onSnapshot(
      tasksCollection,
      (snapshot) => {
        const remoteTasks = snapshot.docs
          .map((docSnapshot) => normalizeTask({ id: docSnapshot.id, ...docSnapshot.data() }))
          .filter((task) => task !== null)
          .map((task) => ({ ...task }));

        onTasks(remoteTasks);
      },
      (error) => {
        console.error('Error al sincronizar datos con Firestore.', error);
      },
    );

    return {
      addTask: async (task) => {
        await setDoc(doc(tasksCollection, task.id), toRemoteTaskRecord(task));
      },
      updateTask: async (taskId, changes) => {
        const payload = buildRemoteChanges(changes);

        if (!Object.keys(payload).length) {
          return;
        }

        payload.updatedAt = Date.now();

        await updateDoc(doc(tasksCollection, taskId), payload);
      },
      deleteTask: async (taskId) => {
        await deleteDoc(doc(tasksCollection, taskId));
      },
      destroy: () => unsubscribe(),
    };
  } catch (error) {
    console.warn('No se pudo activar la sincronización en la nube.', error);
    return null;
  }
};

const createTaskStore = () => {
  let currentTasks = sortTasks(loadTasks());
  const listeners = new Set();
  let remoteController = null;

  const emit = () => {
    const snapshot = currentTasks.map((task) => ({ ...task }));
    listeners.forEach((listener) => listener(snapshot));
  };

  const setTasks = (nextTasks, { persist = true } = {}) => {
    currentTasks = sortTasks(nextTasks).map((task) => ({ ...task }));

    if (persist) {
      saveTasks(currentTasks);
    }

    emit();
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    listener(currentTasks.map((task) => ({ ...task })));

    return () => {
      listeners.delete(listener);
    };
  };

  const init = async () => {
    remoteController = await tryInitializeRemote({
      onTasks: (remoteTasks) => {
        setTasks(remoteTasks);
      },
      getLocalTasks: () => currentTasks.map((task) => ({ ...task })),
    });
  };

  const addTask = async (task) => {
    if (remoteController) {
      await remoteController.addTask(task);
      return;
    }

    setTasks([task, ...currentTasks]);
  };

  const updateTask = async (taskId, changes) => {
    if (remoteController) {
      await remoteController.updateTask(taskId, changes);
      return;
    }

    const now = Date.now();

    setTasks(
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, ...changes, updatedAt: now } : task,
      ),
    );
  };

  const deleteTask = async (taskId) => {
    if (remoteController) {
      await remoteController.deleteTask(taskId);
      return;
    }

    setTasks(currentTasks.filter((task) => task.id !== taskId));
  };

  return {
    subscribe,
    init,
    addTask,
    updateTask,
    deleteTask,
  };
};

let tasks = [];

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

const store = createTaskStore();

const addTask = async ({ description, category, priority, dueDate }) => {
  const trimmedDescription = description.trim();

  if (!trimmedDescription) {
    return;
  }

  const normalizedCategory = isValidCategory(category)
    ? category
    : CATEGORY_OPTIONS[0].value;
  const normalizedPriority = isValidPriority(priority) ? priority : PRIORITY_DEFAULT;
  const normalizedDueDate = normalizeDueDate(dueDate);
  const now = Date.now();

  await store.addTask({
    id: createId(),
    description: trimmedDescription,
    category: normalizedCategory,
    priority: normalizedPriority,
    dueDate: normalizedDueDate,
    completed: false,
    createdAt: now,
    updatedAt: now,
  });
};

const updateTask = async (taskId, changes) => {
  await store.updateTask(taskId, changes);
};

const deleteTask = async (taskId) => {
  await store.deleteTask(taskId);
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await addTask({
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
  } catch (error) {
    console.error('No se pudo guardar la tarea.', error);
    alert('No se pudo guardar la tarea. Revisa tu conexión e inténtalo nuevamente.');
  }
});

list.addEventListener('change', async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) || !target.matches('.task__checkbox')) {
    return;
  }

  const item = target.closest('.task');

  if (!item) {
    return;
  }

  const taskId = item.dataset.id;

  if (!taskId) {
    return;
  }

  try {
    await updateTask(taskId, { completed: target.checked });
  } catch (error) {
    console.error('No se pudo actualizar la tarea.', error);
    alert('No se pudo actualizar la tarea. Revisa tu conexión e inténtalo nuevamente.');
    target.checked = !target.checked;
  }
});

list.addEventListener('click', async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement) || !target.matches('.task__delete')) {
    return;
  }

  const item = target.closest('.task');

  if (!item) {
    return;
  }

  const taskId = item.dataset.id;

  if (!taskId) {
    return;
  }

  try {
    await deleteTask(taskId);
  } catch (error) {
    console.error('No se pudo eliminar la tarea.', error);
    alert('No se pudo eliminar la tarea. Revisa tu conexión e inténtalo nuevamente.');
  }
});

const initializeAppState = async () => {
  store.subscribe((nextTasks) => {
    tasks = nextTasks;
    renderTasks();
  });

  try {
    await store.init();
  } catch (error) {
    console.warn('No se pudo iniciar la sincronización remota.', error);
  }
};

initializeAppState();
selectTab('checklist');


