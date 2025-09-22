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

const mapRemoteSnapshotToTasks = (records) => {
  if (!records || typeof records !== 'object') {
    return [];
  }

  return Object.entries(records)
    .map(([id, value]) => normalizeTask({ ...value, id }))
    .filter((task) => task !== null);
};

const getFirebaseSync = () =>
  typeof window !== 'undefined' && window.FirebaseSync ? window.FirebaseSync : null;

const waitForFirebaseSync = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const existing = getFirebaseSync();

  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const handleReady = () => {
      window.removeEventListener('firebase-sync-ready', handleReady);
      resolve(getFirebaseSync() ?? null);
    };

    window.addEventListener('firebase-sync-ready', handleReady, { once: true });
  });
};

const getFirebaseSession = () =>
  typeof window !== 'undefined' && window.FirebaseSession ? window.FirebaseSession : null;

const waitForFirebaseSession = () => {
  const existing = getFirebaseSession();

  if (existing) {
    return Promise.resolve(existing);
  }

  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const handleReady = () => {
      window.removeEventListener('firebase-sync-ready', handleReady);
      resolve(getFirebaseSession());
    };

    window.addEventListener('firebase-sync-ready', handleReady, { once: true });
  });
};

const waitForCurrentUser = () =>
  waitForFirebaseSession().then((session) => {
    if (!session || typeof session.waitForAuth !== 'function') {
      return null;
    }

    return session
      .waitForAuth()
      .then((user) => user)
      .catch((error) => {
        console.warn('No se pudo obtener la sesión de usuario de Firebase.', error);
        return null;
      });
  });

const getCurrentUser = () => {
  const session = getFirebaseSession();

  if (!session || typeof session.getCurrentUser !== 'function') {
    return null;
  }

  try {
    return session.getCurrentUser();
  } catch (error) {
    console.warn('No se pudo leer el usuario actual de Firebase.', error);
    return null;
  }
};

const createFirebaseController = (syncInstance = getFirebaseSync()) => {
  const sync = syncInstance;

  if (
    !sync ||
    typeof sync.listenTasks !== 'function' ||
    typeof sync.addTask !== 'function' ||
    typeof sync.toggleTask !== 'function' ||
    typeof sync.deleteTask !== 'function'
  ) {
    return null;
  }

  return {
    listen(onTasks) {
      const unsubscribe = sync.listenTasks((records) => {
        const tasks = mapRemoteSnapshotToTasks(records);
        onTasks(tasks);
      });

      return typeof unsubscribe === 'function' ? unsubscribe : () => {};
    },
    async addTask(task) {
      await sync.addTask(task);
    },
    async setCompletion(taskId, completed) {
      await sync.toggleTask(taskId, completed);
    },
    async deleteTask(taskId) {
      await sync.deleteTask(taskId);
    },
  };
};

const isSyncDisabledError = (error) =>
  Boolean(
    error &&
      typeof error === 'object' &&
      (error.message === 'SYNC_OFF' ||
        error.code === 'SYNC_OFF' ||
        error.code === 'auth/network-request-failed' ||
        error.code === 'unavailable'),
  );

const createTaskStore = () => {
  let currentTasks = sortTasks(loadTasks());
  const listeners = new Set();
  let remoteController = null;
  let stopRemoteListener = () => {};

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

  const startRemoteSync = () => {
    if (remoteController) {
      return true;
    }

    const controller = createFirebaseController();

    if (!controller) {
      return false;
    }

    stopRemoteListener();
    stopRemoteListener = () => {};
    remoteController = controller;

    try {
      const unsubscribe = controller.listen((remoteTasks) => {
        setTasks(remoteTasks);
      });

      stopRemoteListener =
        typeof unsubscribe === 'function' ? () => unsubscribe() : () => {};
    } catch (error) {
      remoteController = null;
      stopRemoteListener = () => {};
      throw error;
    }

    return true;
  };

  const init = async () => {
    try {
      if (startRemoteSync()) {
        return;
      }

      await waitForFirebaseSync();

      startRemoteSync();
    } catch (error) {
      remoteController = null;
      stopRemoteListener = () => {};
      throw error;
    }
  };

  const addTask = (task) => {
    const previousTasks = currentTasks.map((item) => ({ ...item }));

    setTasks([task, ...currentTasks]);

    if (!remoteController) {
      return Promise.resolve();
    }

    return remoteController.addTask(task).catch((error) => {
      console.error('Fallo al sincronizar la nueva tarea con Firebase.', error);

      if (isSyncDisabledError(error)) {
        stopRemoteListener();
        stopRemoteListener = () => {};
        remoteController = null;
        return;
      }

      setTasks(previousTasks);
      throw error;
    });
  };

  const updateTask = (taskId, changes) => {
    const previousTasks = currentTasks.map((item) => ({ ...item }));
    const hasCompletionChange = Object.prototype.hasOwnProperty.call(changes, 'completed');
    const now = Date.now();

    setTasks(
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, ...changes, updatedAt: now } : task,
      ),
    );

    if (!remoteController || !hasCompletionChange) {
      return Promise.resolve();
    }

    return remoteController.setCompletion(taskId, Boolean(changes.completed)).catch((error) => {
      console.error('Fallo al actualizar la tarea en Firebase.', error);

      if (isSyncDisabledError(error)) {
        stopRemoteListener();
        stopRemoteListener = () => {};
        remoteController = null;
        return;
      }

      setTasks(previousTasks);
      throw error;
    });
  };

  const deleteTask = (taskId) => {
    const previousTasks = currentTasks.map((item) => ({ ...item }));

    setTasks(currentTasks.filter((task) => task.id !== taskId));

    if (!remoteController) {
      return Promise.resolve();
    }

    return remoteController.deleteTask(taskId).catch((error) => {
      console.error('Fallo al eliminar la tarea en Firebase.', error);

      if (isSyncDisabledError(error)) {
        stopRemoteListener();
        stopRemoteListener = () => {};
        remoteController = null;
        return;
      }

      setTasks(previousTasks);
      throw error;
    });
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

const addTask = ({ description, category, priority, dueDate }) => {
  const trimmedDescription = description.trim();

  if (!trimmedDescription) {
    return Promise.resolve();
  }

  const normalizedCategory = isValidCategory(category)
    ? category
    : CATEGORY_OPTIONS[0].value;
  const normalizedPriority = isValidPriority(priority) ? priority : PRIORITY_DEFAULT;
  const normalizedDueDate = normalizeDueDate(dueDate);
  const now = Date.now();

  return store.addTask({
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

const updateTask = (taskId, changes) => store.updateTask(taskId, changes);

const deleteTask = (taskId) => store.deleteTask(taskId);

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const submission = addTask({
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

  if (submission && typeof submission.catch === 'function') {
    submission.catch((error) => {
      console.error('No se pudo guardar la tarea.', error);
      alert('No se pudo guardar la tarea. Revisa tu conexión e inténtalo nuevamente.');
    });
  }
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

  if (!taskId) {
    return;
  }

  const update = updateTask(taskId, { completed: target.checked });

  if (update && typeof update.catch === 'function') {
    update.catch((error) => {
      console.error('No se pudo actualizar la tarea.', error);
      alert('No se pudo actualizar la tarea. Revisa tu conexión e inténtalo nuevamente.');
      target.checked = !target.checked;
    });
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

  if (!taskId) {
    return;
  }

  const removal = deleteTask(taskId);

  if (removal && typeof removal.catch === 'function') {
    removal.catch((error) => {
      console.error('No se pudo eliminar la tarea.', error);
      alert('No se pudo eliminar la tarea. Revisa tu conexión e inténtalo nuevamente.');
    });
  }
});

const sanitizeEntityText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const sanitizeIdeaImage = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  if (typeof URL === 'function') {
    try {
      const parsed = new URL(trimmed);

      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch (error) {
      // Ignorar valores que no sean URLs válidas.
    }
  }

  return '';
};

// Invitados
const RSVP_LABELS = {
  yes: 'Confirmado',
  pending: 'Pendiente',
  no: 'Rechazado',
};
const SIDE_LABELS = {
  novia: 'Novia',
  novio: 'Novio',
  ambos: 'Ambos',
};

const guestForm = document.getElementById('guest-form');
const guestNameInput = document.getElementById('guest-name');
const guestSideSelect = document.getElementById('guest-side');
const guestGroupInput = document.getElementById('guest-group');
const guestRsvpSelect = document.getElementById('guest-rsvp');
const guestPlusInput = document.getElementById('guest-plus');
const guestContactInput = document.getElementById('guest-contact');
const guestDietaryInput = document.getElementById('guest-dietary');
const guestNotesInput = document.getElementById('guest-notes');
const guestList = document.getElementById('guest-list');
const guestSearchInput = document.getElementById('guest-search');
const guestRsvpFilter = document.getElementById('guest-rsvp-filter');
const guestGroupFilter = document.getElementById('guest-group-filter');
const guestExportButton = document.getElementById('guest-export');

const guestCounters = {
  total: document.getElementById('guest-total'),
  confirmed: document.getElementById('guest-confirmed'),
  pending: document.getElementById('guest-pending'),
  people: document.getElementById('guest-people'),
};

const guestFiltersState = {
  search: '',
  rsvp: '',
  group: '',
};

const isValidGuestSide = (value) => Object.prototype.hasOwnProperty.call(SIDE_LABELS, value);
const isValidGuestRsvp = (value) => Object.prototype.hasOwnProperty.call(RSVP_LABELS, value);

const normalizeGuestRecord = (id, record) => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const name = sanitizeEntityText(record.name);

  if (!name) {
    return null;
  }

  const plus = Number.parseInt(record.plusOnes, 10);

  return {
    id,
    name,
    side: isValidGuestSide(record.side) ? record.side : 'ambos',
    group: sanitizeEntityText(record.group),
    rsvp: isValidGuestRsvp(record.rsvp) ? record.rsvp : 'pending',
    plusOnes: Number.isFinite(plus) ? Math.max(0, plus) : 0,
    dietary: sanitizeEntityText(record.dietary),
    notes: sanitizeEntityText(record.notes),
    contact: sanitizeEntityText(record.contact),
    createdAt: toTimestamp(record.createdAt),
    updatedAt: toTimestamp(record.updatedAt),
    createdBy: sanitizeEntityText(record.createdBy),
  };
};

const mapGuestRecords = (records) =>
  Object.entries(records ?? {})
    .map(([id, value]) => normalizeGuestRecord(id, value))
    .filter((value) => value !== null)
    .sort((first, second) =>
      first.name.localeCompare(second.name, 'es', { sensitivity: 'base' }),
    );

const createGuestsStore = () => {
  let sync = null;
  let unsubscribe = () => {};
  let rawRecords = {};
  let guests = [];
  const listeners = new Set();

  const emit = () => {
    const snapshot = {
      guests: guests.map((guest) => ({ ...guest })),
      raw: { ...rawRecords },
    };
    listeners.forEach((listener) => listener(snapshot));
  };

  const ensureSync = async () => {
    if (sync) {
      return sync;
    }

    const instance = await waitForFirebaseSync();
    if (!instance) {
      throw new Error('SYNC_UNAVAILABLE');
    }

    sync = instance;
    return sync;
  };

  const init = () =>
    ensureSync()
      .then((instance) => {
        if (!instance || typeof instance.listenGuests !== 'function') {
          return;
        }

        unsubscribe();
        unsubscribe = () => {};

        try {
          const stop = instance.listenGuests((records) => {
            rawRecords = records ?? {};
            guests = mapGuestRecords(records);
            emit();
          });

          unsubscribe = typeof stop === 'function' ? stop : () => {};
        } catch (error) {
          console.warn('No se pudo iniciar la escucha de invitados.', error);
        }
      })
      .catch((error) => {
        console.warn('No se pudo iniciar la sincronización de invitados.', error);
      });

  const subscribe = (listener) => {
    listeners.add(listener);
    listener({
      guests: guests.map((guest) => ({ ...guest })),
      raw: { ...rawRecords },
    });

    return () => {
      listeners.delete(listener);
    };
  };

  const addGuest = (payload) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.addGuest !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.addGuest(payload);
    });

  const updateGuest = (guestId, changes) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.updateGuest !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.updateGuest(guestId, changes);
    });

  const deleteGuest = (guestId) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.deleteGuest !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.deleteGuest(guestId);
    });

  const exportCSV = () =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.exportGuestsCSV !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.exportGuestsCSV(rawRecords);
    });

  const destroy = () => {
    try {
      unsubscribe();
    } catch (error) {
      console.warn('No se pudo detener la escucha de invitados.', error);
    }
    unsubscribe = () => {};
    listeners.clear();
  };

  const getSnapshot = () => ({
    guests: guests.map((guest) => ({ ...guest })),
    raw: { ...rawRecords },
  });

  return {
    init,
    subscribe,
    addGuest,
    updateGuest,
    deleteGuest,
    exportCSV,
    destroy,
    getSnapshot,
  };
};

const guestsStore = createGuestsStore();

let guestsData = [];
let guestRawRecords = {};

const applyGuestFilters = (items) => {
  const search = guestFiltersState.search;
  const rsvpFilter = guestFiltersState.rsvp;
  const groupFilter = guestFiltersState.group;

  return items.filter((guest) => {
    if (search && !guest.name.toLowerCase().includes(search)) {
      return false;
    }

    if (rsvpFilter && guest.rsvp !== rsvpFilter) {
      return false;
    }

    if (groupFilter && guest.group !== groupFilter) {
      return false;
    }

    return true;
  });
};

const renderGuestSummary = () => {
  if (!guestCounters.total) {
    return;
  }

  const total = guestsData.length;
  const confirmed = guestsData.filter((guest) => guest.rsvp === 'yes').length;
  const pending = guestsData.filter((guest) => guest.rsvp === 'pending').length;
  const people = guestsData.reduce(
    (sum, guest) => sum + 1 + Math.max(0, guest.plusOnes || 0),
    0,
  );

  guestCounters.total.textContent = String(total);
  guestCounters.confirmed.textContent = String(confirmed);
  guestCounters.pending.textContent = String(pending);
  guestCounters.people.textContent = String(people);
};

const buildGuestMetaText = (guest) => {
  const parts = [];

  parts.push(SIDE_LABELS[guest.side] || guest.side);

  if (guest.group) {
    parts.push(`Grupo: ${guest.group}`);
  }

  parts.push(`Personas: ${1 + Math.max(0, guest.plusOnes || 0)}`);

  return parts.join(' • ');
};

const createGuestCard = (guest) => {
  const item = document.createElement('li');
  item.className = 'guest-card';
  item.dataset.id = guest.id;

  const header = document.createElement('div');
  header.className = 'guest-card__header';

  const headerContent = document.createElement('div');
  headerContent.className = 'guest-card__header-content';

  const name = document.createElement('h3');
  name.className = 'guest-card__name';
  name.textContent = guest.name;

  const meta = document.createElement('p');
  meta.className = 'guest-card__meta';
  meta.textContent = buildGuestMetaText(guest);

  headerContent.append(name, meta);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'guest-card__delete';
  deleteButton.textContent = 'Eliminar';
  deleteButton.setAttribute('aria-label', `Eliminar invitado: ${guest.name}`);

  header.append(headerContent, deleteButton);

  const controls = document.createElement('div');
  controls.className = 'guest-card__controls';

  const rsvpField = document.createElement('label');
  rsvpField.className = 'guest-card__field';
  rsvpField.textContent = 'Asistencia';

  const rsvpSelect = document.createElement('select');
  rsvpSelect.className = 'guest-card__rsvp';
  rsvpSelect.setAttribute('aria-label', `Estado de ${guest.name}`);

  Object.entries(RSVP_LABELS).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    rsvpSelect.append(option);
  });
  rsvpSelect.value = guest.rsvp;

  rsvpField.append(rsvpSelect);

  const plusField = document.createElement('label');
  plusField.className = 'guest-card__field';
  plusField.textContent = 'Acompañantes';

  const plusInput = document.createElement('input');
  plusInput.className = 'guest-card__plus';
  plusInput.type = 'number';
  plusInput.min = '0';
  plusInput.step = '1';
  plusInput.value = String(Math.max(0, guest.plusOnes || 0));
  plusInput.setAttribute('aria-label', `Acompañantes de ${guest.name}`);

  plusField.append(plusInput);

  controls.append(rsvpField, plusField);

  const details = document.createElement('div');
  details.className = 'guest-card__details';

  const createDetailField = (labelText, value, className, { multiline = false } = {}) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'guest-card__field';

    const title = document.createElement('span');
    title.className = 'guest-card__field-label';
    title.textContent = labelText;
    wrapper.append(title);

    if (multiline) {
      const textarea = document.createElement('textarea');
      textarea.className = className;
      textarea.rows = 2;
      textarea.value = value || '';
      textarea.placeholder = 'Añade una nota';
      wrapper.append(textarea);
      return wrapper;
    }

    const input = document.createElement('input');
    input.className = className;
    input.type = 'text';
    input.value = value || '';
    wrapper.append(input);
    return wrapper;
  };

  const contactField = createDetailField('Contacto', guest.contact, 'guest-card__contact');
  const dietaryField = createDetailField(
    'Restricciones',
    guest.dietary,
    'guest-card__dietary',
  );
  const notesField = createDetailField('Notas', guest.notes, 'guest-card__notes', {
    multiline: true,
  });

  details.append(contactField, dietaryField, notesField);

  item.append(header, controls, details);

  return item;
};

const renderGuestList = () => {
  if (!guestList) {
    return;
  }

  guestList.innerHTML = '';

  const filtered = applyGuestFilters(guestsData);

  if (!filtered.length) {
    const empty = document.createElement('li');
    empty.className = 'guest-card guest-card--empty';

    const message = document.createElement('p');
    message.className = 'guest-card__empty-message';
    message.textContent = guestsData.length
      ? 'No hay invitados que coincidan con los filtros.'
      : 'Añade invitados para comenzar.';

    empty.append(message);
    guestList.append(empty);
    return;
  }

  filtered.forEach((guest) => {
    guestList.append(createGuestCard(guest));
  });
};

const updateGuestGroupFilter = () => {
  if (!guestGroupFilter) {
    return;
  }

  const currentValue = guestGroupFilter.value;

  Array.from(guestGroupFilter.options)
    .slice(1)
    .forEach((option) => option.remove());

  const groups = Array.from(
    new Set(guestsData.map((guest) => guest.group).filter((group) => Boolean(group))),
  ).sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }));

  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    guestGroupFilter.append(option);
  });

  if (currentValue && !groups.includes(currentValue)) {
    guestGroupFilter.value = '';
    guestFiltersState.group = '';
  } else if (currentValue) {
    guestGroupFilter.value = currentValue;
  }
};

const resetGuestForm = () => {
  if (!guestForm) {
    return;
  }

  guestForm.reset();

  if (guestSideSelect) {
    guestSideSelect.value = 'novia';
  }

  if (guestRsvpSelect) {
    guestRsvpSelect.value = 'pending';
  }

  if (guestPlusInput) {
    guestPlusInput.value = '0';
  }
};

const handleGuestFormSubmit = (event) => {
  event.preventDefault();

  if (!guestForm) {
    return;
  }

  const payload = {
    name: guestNameInput ? guestNameInput.value : '',
    side: guestSideSelect ? guestSideSelect.value : 'ambos',
    group: guestGroupInput ? guestGroupInput.value : '',
    rsvp: guestRsvpSelect ? guestRsvpSelect.value : 'pending',
    plusOnes: guestPlusInput ? Number.parseInt(guestPlusInput.value, 10) || 0 : 0,
    contact: guestContactInput ? guestContactInput.value : '',
    dietary: guestDietaryInput ? guestDietaryInput.value : '',
    notes: guestNotesInput ? guestNotesInput.value : '',
  };

  const submission = guestsStore.addGuest(payload);

  resetGuestForm();

  if (guestNameInput) {
    guestNameInput.focus();
  }

  if (submission && typeof submission.catch === 'function') {
    submission.catch((error) => {
      console.error('No se pudo guardar el invitado.', error);
      alert('No se pudo guardar el invitado. Revisa tu conexión e inténtalo nuevamente.');
    });
  }
};

const handleGuestListChange = (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const card = target.closest('.guest-card');

  if (!card) {
    return;
  }

  const guestId = card.dataset.id;

  if (!guestId) {
    return;
  }

  let changes = null;

  if (target.matches('.guest-card__rsvp')) {
    changes = { rsvp: target.value };
  } else if (target.matches('.guest-card__plus')) {
    changes = { plusOnes: Number.parseInt(target.value, 10) || 0 };
  } else if (target.matches('.guest-card__contact')) {
    changes = { contact: target.value };
  } else if (target.matches('.guest-card__dietary')) {
    changes = { dietary: target.value };
  } else if (target.matches('.guest-card__notes')) {
    changes = { notes: target.value };
  }

  if (!changes) {
    return;
  }

  const update = guestsStore.updateGuest(guestId, changes);

  if (update && typeof update.catch === 'function') {
    update.catch((error) => {
      console.error('No se pudo actualizar el invitado.', error);
      alert('No se pudo actualizar el invitado. Inténtalo nuevamente.');
    });
  }
};

const handleGuestListClick = (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement) || !target.matches('.guest-card__delete')) {
    return;
  }

  const card = target.closest('.guest-card');

  if (!card) {
    return;
  }

  const guestId = card.dataset.id;

  if (!guestId) {
    return;
  }

  const confirmed = window.confirm('¿Quieres eliminar este invitado?');

  if (!confirmed) {
    return;
  }

  const removal = guestsStore.deleteGuest(guestId);

  if (removal && typeof removal.catch === 'function') {
    removal.catch((error) => {
      console.error('No se pudo eliminar el invitado.', error);
      alert('No se pudo eliminar el invitado. Inténtalo nuevamente.');
    });
  }
};

const handleGuestSearchInput = (event) => {
  const value = typeof event.target.value === 'string' ? event.target.value : '';
  guestFiltersState.search = value.trim().toLowerCase();
  renderGuestList();
};

const handleGuestRsvpFilterChange = (event) => {
  guestFiltersState.rsvp = event.target.value;
  renderGuestList();
};

const handleGuestGroupFilterChange = (event) => {
  guestFiltersState.group = event.target.value;
  renderGuestList();
};

const downloadCsv = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const handleGuestExport = () => {
  const exportAction = guestsStore.exportCSV();

  if (!exportAction || typeof exportAction.then !== 'function') {
    return;
  }

  exportAction
    .then((csv) => {
      if (!csv) {
        alert('No hay datos para exportar todavía.');
        return;
      }

      const filename = `invitados-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(csv, filename);
    })
    .catch((error) => {
      console.error('No se pudo exportar la lista de invitados.', error);
      alert('No se pudo exportar la lista de invitados. Inténtalo nuevamente.');
    });
};

const initializeGuestSection = () => {
  if (!guestForm || !guestList) {
    return;
  }

  guestsStore.subscribe(({ guests, raw }) => {
    guestsData = guests;
    guestRawRecords = raw;
    updateGuestGroupFilter();
    renderGuestSummary();
    renderGuestList();
  });

  guestsStore.init();

  guestForm.addEventListener('submit', handleGuestFormSubmit);

  if (guestSearchInput) {
    guestSearchInput.addEventListener('input', handleGuestSearchInput);
  }

  if (guestRsvpFilter) {
    guestRsvpFilter.addEventListener('change', handleGuestRsvpFilterChange);
  }

  if (guestGroupFilter) {
    guestGroupFilter.addEventListener('change', handleGuestGroupFilterChange);
  }

  guestList.addEventListener('change', handleGuestListChange);
  guestList.addEventListener('click', handleGuestListClick);

  if (guestExportButton) {
    guestExportButton.addEventListener('click', handleGuestExport);
  }
};

// Ideas
const ideaForm = document.getElementById('idea-form');
const createIdeaImageViewer = () => {
  let container = null;
  let image = null;
  let caption = null;
  let closeButton = null;
  let lastActiveElement = null;

  const close = () => {
    if (!container) {
      return;
    }

    container.classList.remove('is-visible');
    container.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('idea-image-viewer-open');

    if (image) {
      image.src = '';
    }

    if (caption) {
      caption.textContent = '';
      caption.hidden = true;
    }

    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }

    lastActiveElement = null;
  };

  const ensureElements = () => {
    if (container) {
      return;
    }

    container = document.createElement('div');
    container.className = 'idea-image-viewer';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-hidden', 'true');

    const backdrop = document.createElement('div');
    backdrop.className = 'idea-image-viewer__backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'idea-image-viewer__dialog';
    dialog.setAttribute('role', 'document');

    const figure = document.createElement('figure');
    figure.className = 'idea-image-viewer__figure';

    image = document.createElement('img');
    image.className = 'idea-image-viewer__image';
    image.alt = '';

    caption = document.createElement('figcaption');
    caption.className = 'idea-image-viewer__caption';
    caption.hidden = true;

    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'idea-image-viewer__close';
    closeButton.textContent = 'Cerrar';

    figure.append(image, caption);
    dialog.append(figure, closeButton);
    container.append(backdrop, dialog);
    document.body.append(container);

    backdrop.addEventListener('click', close);
    container.addEventListener('click', (event) => {
      if (event.target === container) {
        close();
      }
    });

    closeButton.addEventListener('click', close);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && container && container.classList.contains('is-visible')) {
        event.preventDefault();
        close();
      }
    });
  };

  const open = (source, title) => {
    if (!source) {
      return;
    }

    ensureElements();

    if (!container || !image || !closeButton) {
      return;
    }

    lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    image.src = source;
    image.alt = title ? `Inspiración: ${title}` : 'Idea guardada';

    if (caption) {
      caption.textContent = title || '';
      caption.hidden = !title;
    }

    container.setAttribute('aria-hidden', 'false');
    container.classList.add('is-visible');
    document.body.classList.add('idea-image-viewer-open');

    window.requestAnimationFrame(() => {
      closeButton.focus();
    });
  };

  return { open, close };
};

const ideaImageViewer = createIdeaImageViewer();

const ideaTitleInput = document.getElementById('idea-title');
const ideaUrlInput = document.getElementById('idea-url');
const ideaImageInput = document.getElementById('idea-image');
const ideaCategoryInput = document.getElementById('idea-category');
const ideaNoteInput = document.getElementById('idea-note');
const ideaSearchInput = document.getElementById('idea-search');
const ideaCategoryFilter = document.getElementById('idea-category-filter');
const ideasGrid = document.getElementById('ideas-grid');

const normalizeIdeaRecord = (id, record) => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const title = sanitizeEntityText(record.title);

  if (!title) {
    return null;
  }

  const likes =
    record.likes && typeof record.likes === 'object' ? record.likes : {};

  return {
    id,
    title,
    url: sanitizeEntityText(record.url),
    category: sanitizeEntityText(record.category) || 'Sin categoría',
    note: sanitizeEntityText(record.note),
    image: sanitizeIdeaImage(record.image),
    likes,
    createdAt: toTimestamp(record.createdAt),
    updatedAt: toTimestamp(record.updatedAt),
    createdBy: sanitizeEntityText(record.createdBy),
  };
};

const mapIdeaRecords = (records) =>
  Object.entries(records ?? {})
    .map(([id, value]) => normalizeIdeaRecord(id, value))
    .filter((value) => value !== null)
    .sort((first, second) => {
      const firstTime = typeof first.createdAt === 'number' ? first.createdAt : 0;
      const secondTime = typeof second.createdAt === 'number' ? second.createdAt : 0;
      return secondTime - firstTime;
    });

const createIdeasStore = () => {
  let sync = null;
  let unsubscribe = () => {};
  let ideas = [];
  let rawRecords = {};
  const listeners = new Set();

  const emit = () => {
    const snapshot = {
      ideas: ideas.map((idea) => ({ ...idea })),
      raw: { ...rawRecords },
    };
    listeners.forEach((listener) => listener(snapshot));
  };

  const ensureSync = async () => {
    if (sync) {
      return sync;
    }

    const instance = await waitForFirebaseSync();
    if (!instance) {
      throw new Error('SYNC_UNAVAILABLE');
    }

    sync = instance;
    return sync;
  };

  const init = () =>
    ensureSync()
      .then((instance) => {
        if (!instance || typeof instance.listenIdeas !== 'function') {
          return;
        }

        unsubscribe();
        unsubscribe = () => {};

        try {
          const stop = instance.listenIdeas((records) => {
            rawRecords = records ?? {};
            ideas = mapIdeaRecords(records);
            emit();
          });

          unsubscribe = typeof stop === 'function' ? stop : () => {};
        } catch (error) {
          console.warn('No se pudo iniciar la escucha de ideas.', error);
        }
      })
      .catch((error) => {
        console.warn('No se pudo iniciar la sincronización de ideas.', error);
      });

  const subscribe = (listener) => {
    listeners.add(listener);
    listener({ ideas: ideas.map((idea) => ({ ...idea })), raw: { ...rawRecords } });

    return () => {
      listeners.delete(listener);
    };
  };

  const addIdea = (payload, uid) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.addIdea !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.addIdea(payload, uid);
    });

  const toggleLike = (ideaId, uid, isLiked) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.toggleLike !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.toggleLike(ideaId, uid, isLiked);
    });

  const deleteIdea = (ideaId) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.deleteIdea !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.deleteIdea(ideaId);
    });

  const destroy = () => {
    try {
      unsubscribe();
    } catch (error) {
      console.warn('No se pudo detener la escucha de ideas.', error);
    }
    unsubscribe = () => {};
    listeners.clear();
  };

  const getSnapshot = () => ({
    ideas: ideas.map((idea) => ({ ...idea })),
    raw: { ...rawRecords },
  });

  return {
    init,
    subscribe,
    addIdea,
    toggleLike,
    deleteIdea,
    destroy,
    getSnapshot,
  };
};

const ideasStore = createIdeasStore();

let ideasData = [];
const ideaFilters = {
  search: '',
  category: '',
};
let currentIdeaUserId = null;

const applyIdeaFilters = (ideas) => {
  const search = ideaFilters.search;
  const category = ideaFilters.category;

  return ideas.filter((idea) => {
    if (search && !idea.title.toLowerCase().includes(search)) {
      return false;
    }

    if (category && idea.category !== category) {
      return false;
    }

    return true;
  });
};

const createIdeaCard = (idea, uid) => {
  const card = document.createElement('article');
  card.className = 'idea-card';
  card.dataset.id = idea.id;

  const header = document.createElement('header');
  header.className = 'idea-card__header';

  const titleElement = idea.url ? document.createElement('a') : document.createElement('h3');
  titleElement.className = 'idea-card__title';
  titleElement.textContent = idea.title;

  if (idea.url) {
    titleElement.href = idea.url;
    titleElement.target = '_blank';
    titleElement.rel = 'noopener noreferrer';
  }

  const category = document.createElement('span');
  category.className = 'idea-card__category';
  category.textContent = idea.category;

  header.append(titleElement, category);
  card.append(header);

  if (idea.image) {
    const media = document.createElement('figure');
    media.className = 'idea-card__media';

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'idea-card__preview';
    previewButton.dataset.image = idea.image;

    if (idea.title) {
      previewButton.dataset.title = idea.title;
    }

    const previewLabel = idea.title ? `Ver imagen de ${idea.title}` : 'Ver imagen de la idea';
    previewButton.setAttribute('aria-label', previewLabel);
    previewButton.title = 'Ver imagen ampliada';

    const image = document.createElement('img');
    image.className = 'idea-card__image';
    image.src = idea.image;
    image.alt = idea.title ? `Inspiración: ${idea.title}` : 'Idea guardada';
    image.loading = 'lazy';
    image.decoding = 'async';

    previewButton.append(image);
    media.append(previewButton);
    card.append(media);
  }

  if (idea.note) {
    const note = document.createElement('p');
    note.className = 'idea-card__note';
    note.textContent = idea.note;
    card.append(note);
  }

  const footer = document.createElement('footer');
  footer.className = 'idea-card__footer';

  const likesCount = idea.likes ? Object.keys(idea.likes).length : 0;
  const isLiked = uid ? Boolean(idea.likes && idea.likes[uid]) : false;

  const likeButton = document.createElement('button');
  likeButton.type = 'button';
  likeButton.className = 'idea-card__like';
  likeButton.textContent = `❤️ ${likesCount}`;
  likeButton.dataset.count = String(likesCount);
  likeButton.dataset.liked = String(isLiked);
  likeButton.setAttribute('aria-pressed', String(isLiked));
  likeButton.title = uid
    ? isLiked
      ? 'Quitar de favoritos'
      : 'Marcar como favorito'
    : 'Conectando con la base de datos...';

  if (isLiked) {
    likeButton.classList.add('is-liked');
  }

  if (!uid) {
    likeButton.disabled = true;
  }

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'idea-card__delete';
  deleteButton.textContent = 'Eliminar';
  deleteButton.setAttribute('aria-label', `Eliminar idea: ${idea.title}`);

  footer.append(likeButton, deleteButton);
  card.append(footer);

  return card;
};

const readIdeaImageFile = (input) => {
  if (!input || !input.files || input.files.length === 0) {
    return Promise.resolve('');
  }

  const [file] = input.files;

  if (!file) {
    return Promise.resolve('');
  }

  if (file.type && !file.type.startsWith('image/')) {
    const error = new Error('INVALID_IMAGE_TYPE');
    error.code = 'INVALID_IMAGE_TYPE';
    return Promise.reject(error);
  }

  if (typeof FileReader === 'undefined') {
    const error = new Error('FILE_READER_UNAVAILABLE');
    error.code = 'FILE_READER_UNAVAILABLE';
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result.trim() : '';

      if (result && result.startsWith('data:image/')) {
        resolve(result);
        return;
      }

      resolve('');
    };

    reader.onerror = () => {
      const error = new Error('IMAGE_READ_FAILED');
      error.code = 'IMAGE_READ_FAILED';
      reject(error);
    };

    reader.onabort = () => {
      const error = new Error('IMAGE_READ_ABORTED');
      error.code = 'IMAGE_READ_ABORTED';
      reject(error);
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      const readError = new Error('IMAGE_READ_FAILED');
      readError.code = 'IMAGE_READ_FAILED';
      reject(readError);
    }
  });
};

const updateIdeasCategoryFilter = () => {
  if (!ideaCategoryFilter) {
    return;
  }

  const currentValue = ideaCategoryFilter.value;

  Array.from(ideaCategoryFilter.options)
    .slice(1)
    .forEach((option) => option.remove());

  const categories = Array.from(
    new Set(ideasData.map((idea) => idea.category).filter((category) => Boolean(category))),
  ).sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }));

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    ideaCategoryFilter.append(option);
  });

  if (currentValue && !categories.includes(currentValue)) {
    ideaCategoryFilter.value = '';
    ideaFilters.category = '';
  } else if (currentValue) {
    ideaCategoryFilter.value = currentValue;
  }
};

const renderIdeas = () => {
  if (!ideasGrid) {
    return;
  }

  ideasGrid.innerHTML = '';

  const filtered = applyIdeaFilters(ideasData);

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'idea-card__empty';
    empty.textContent = ideasData.length
      ? 'No hay ideas que coincidan con los filtros.'
      : 'Guarda tus primeras ideas para inspirarte.';
    ideasGrid.append(empty);
    return;
  }

  filtered.forEach((idea) => {
    ideasGrid.append(createIdeaCard(idea, currentIdeaUserId));
  });
};

const handleIdeaFormSubmit = async (event) => {
  event.preventDefault();

  if (!ideaForm) {
    return;
  }

  let imageData = '';

  try {
    imageData = await readIdeaImageFile(ideaImageInput);
  } catch (error) {
    console.error('No se pudo procesar la imagen seleccionada.', error);

    if (error && error.code === 'IMAGE_READ_ABORTED') {
      return;
    }

    if (error && error.code === 'INVALID_IMAGE_TYPE') {
      alert('Selecciona un archivo de imagen válido (JPG, PNG, HEIC…).');
    } else if (error && error.code === 'FILE_READER_UNAVAILABLE') {
      alert('Tu navegador no permite subir imágenes en este dispositivo.');
    } else {
      alert('No se pudo leer la imagen seleccionada. Inténtalo nuevamente.');
    }

    return;
  }

  const payload = {
    title: ideaTitleInput ? ideaTitleInput.value : '',
    url: ideaUrlInput ? ideaUrlInput.value : '',
    category: ideaCategoryInput ? ideaCategoryInput.value : '',
    note: ideaNoteInput ? ideaNoteInput.value : '',
  };

  if (imageData) {
    payload.image = imageData;
  }

  const user = getCurrentUser();
  const uid = currentIdeaUserId || (user && user.uid ? user.uid : null);

  const submission = ideasStore.addIdea(payload, uid);

  ideaForm.reset();

  if (ideaTitleInput) {
    ideaTitleInput.focus();
  }

  if (submission && typeof submission.catch === 'function') {
    submission.catch((error) => {
      console.error('No se pudo guardar la idea.', error);
      alert('No se pudo guardar la idea. Inténtalo nuevamente.');
    });
  }
};

const handleIdeaGridClick = (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;

  if (!target) {
    return;
  }

  const previewButton = target.closest('.idea-card__preview');

  if (previewButton) {
    const imageSource = previewButton.dataset.image || '';
    const title = previewButton.dataset.title || '';
    ideaImageViewer.open(imageSource, title);
    return;
  }

  const likeButton = target.closest('.idea-card__like');
  const deleteButton = target.closest('.idea-card__delete');
  const control = likeButton || deleteButton;

  if (!control) {
    return;
  }

  const card = control.closest('.idea-card');

  if (!card) {
    return;
  }

  const ideaId = card.dataset.id;

  if (!ideaId) {
    return;
  }

  if (likeButton) {
    if (!currentIdeaUserId) {
      alert('Esperando autenticación con Firebase. Intenta nuevamente en unos segundos.');
      return;
    }

    const isLiked = likeButton.classList.contains('is-liked');
    const toggle = ideasStore.toggleLike(ideaId, currentIdeaUserId, isLiked);

    if (toggle && typeof toggle.catch === 'function') {
      toggle.catch((error) => {
        console.error('No se pudo actualizar el favorito.', error);
        alert('No se pudo actualizar el favorito. Inténtalo nuevamente.');
      });
    }

    return;
  }

  if (deleteButton) {
    const confirmed = window.confirm('¿Quieres eliminar esta idea?');

    if (!confirmed) {
      return;
    }

    const removal = ideasStore.deleteIdea(ideaId);

    if (removal && typeof removal.catch === 'function') {
      removal.catch((error) => {
        console.error('No se pudo eliminar la idea.', error);
        alert('No se pudo eliminar la idea. Inténtalo nuevamente.');
      });
    }
  }
};

const initializeIdeasSection = () => {
  if (!ideaForm || !ideasGrid) {
    return;
  }

  ideasStore.subscribe(({ ideas }) => {
    ideasData = ideas;
    updateIdeasCategoryFilter();
    renderIdeas();
  });

  ideasStore.init();

  ideaForm.addEventListener('submit', handleIdeaFormSubmit);

  if (ideaSearchInput) {
    ideaSearchInput.addEventListener('input', (event) => {
      const value = typeof event.target.value === 'string' ? event.target.value : '';
      ideaFilters.search = value.trim().toLowerCase();
      renderIdeas();
    });
  }

  if (ideaCategoryFilter) {
    ideaCategoryFilter.addEventListener('change', (event) => {
      ideaFilters.category = event.target.value;
      renderIdeas();
    });
  }

  ideasGrid.addEventListener('click', handleIdeaGridClick);

  waitForCurrentUser()
    .then((user) => {
      currentIdeaUserId = user && user.uid ? user.uid : null;
      renderIdeas();
    })
    .catch((error) => {
      console.warn('No se pudo obtener el usuario para los likes.', error);
    });
};

// Lugares
const venueForm = document.getElementById('venue-form');
const venueNameInput = document.getElementById('venue-name');
const venueAddressInput = document.getElementById('venue-address');
const venueMapsInput = document.getElementById('venue-maps');
const venueCapacityInput = document.getElementById('venue-capacity');
const venuePriceInput = document.getElementById('venue-price');
const venueDateInput = document.getElementById('venue-date');
const venueContactInput = document.getElementById('venue-contact');
const venueNotesInput = document.getElementById('venue-notes');
const venueStatusSelect = document.getElementById('venue-status');

const venuesGrid = document.getElementById('venues-grid');
const venuesTableWrapper = document.getElementById('venues-table');
const venuesTableBody = document.getElementById('venues-table-body');

const venueStatusFilter = document.getElementById('venue-status-filter');
const venueCapacityMinInput = document.getElementById('venue-capacity-min');
const venueCapacityMaxInput = document.getElementById('venue-capacity-max');
const venueSortSelect = document.getElementById('venue-sort');
const venueSearchInput = document.getElementById('venue-search');
const venueViewCardsButton = document.getElementById('venue-view-cards');
const venueViewTableButton = document.getElementById('venue-view-table');
const venueExportButton = document.getElementById('venue-export');

const venueSummaryElements = {
  total: document.getElementById('venue-total'),
  favorites: document.getElementById('venue-favorites'),
  pending: document.getElementById('venue-pending'),
  average: document.getElementById('venue-price-avg'),
  median: document.getElementById('venue-price-median'),
};

const VENUE_STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'visitado', label: 'Visitado' },
  { value: 'favorito', label: 'Favorito' },
  { value: 'descartado', label: 'Descartado' },
];

const VENUE_STATUS_LABELS = VENUE_STATUS_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label;
  return labels;
}, {});

const VENUE_DEFAULT_STATUS = 'pendiente';
const VENUE_STORAGE_KEY = 'venues-preferences';

const venueCurrencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const formatVenuePrice = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? venueCurrencyFormatter.format(value) : '';

const sanitizeVenueUrl = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
};

const normalizeVenueStatusValue = (value) =>
  Object.prototype.hasOwnProperty.call(VENUE_STATUS_LABELS, value) ? value : VENUE_DEFAULT_STATUS;

const normalizeVenueCapacityValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);

    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return null;
};

const normalizeVenuePriceValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0) {
      return null;
    }

    return Number.parseFloat(value.toFixed(2));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.replace(/,/g, '.');
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Number.parseFloat(parsed.toFixed(2));
    }
  }

  return null;
};

const normalizeVenueDateValue = (value) => normalizeDueDate(value);

const formatVenueDate = (value) => {
  const normalized = normalizeVenueDateValue(value);

  if (!normalized) {
    return '';
  }

  const [year, month, day] = normalized.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const normalizeVenueRecord = (id, record) => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const name = sanitizeEntityText(record.name);

  if (!name) {
    return null;
  }

  const capacity = normalizeVenueCapacityValue(record.capacity);
  const price = normalizeVenuePriceValue(record.price);
  const availableDate = normalizeVenueDateValue(record.availableDate);
  const mapsUrl = sanitizeVenueUrl(record.mapsUrl);

  const photos = Array.isArray(record.photos)
    ? record.photos.map((photo) => sanitizeEntityText(photo)).filter((photo) => Boolean(photo))
    : [];

  return {
    id,
    name,
    address: sanitizeEntityText(record.address),
    mapsUrl,
    capacity,
    price,
    availableDate,
    contact: sanitizeEntityText(record.contact),
    notes: sanitizeEntityText(record.notes),
    status: normalizeVenueStatusValue(record.status),
    photos,
    createdAt: toTimestamp(record.createdAt),
    updatedAt: toTimestamp(record.updatedAt),
    createdBy: sanitizeEntityText(record.createdBy),
  };
};

const mapVenueRecords = (records) =>
  Object.entries(records ?? {})
    .map(([id, value]) => normalizeVenueRecord(id, value))
    .filter((venue) => venue !== null)
    .sort((first, second) => {
      const firstTime =
        typeof first.updatedAt === 'number'
          ? first.updatedAt
          : typeof first.createdAt === 'number'
          ? first.createdAt
          : 0;
      const secondTime =
        typeof second.updatedAt === 'number'
          ? second.updatedAt
          : typeof second.createdAt === 'number'
          ? second.createdAt
          : 0;

      return secondTime - firstTime;
    });

const createVenuesStore = () => {
  let sync = null;
  let unsubscribe = () => {};
  let venues = [];
  let rawRecords = {};
  const listeners = new Set();

  const emit = () => {
    const snapshot = {
      venues: venues.map((venue) => ({ ...venue })),
      raw: { ...rawRecords },
    };

    listeners.forEach((listener) => listener(snapshot));
  };

  const ensureSync = async () => {
    if (sync) {
      return sync;
    }

    const instance = await waitForFirebaseSync();

    if (!instance) {
      throw new Error('SYNC_UNAVAILABLE');
    }

    sync = instance;
    return sync;
  };

  const init = () =>
    ensureSync()
      .then((instance) => {
        if (!instance || typeof instance.listenVenues !== 'function') {
          return;
        }

        unsubscribe();
        unsubscribe = () => {};

        try {
          const stop = instance.listenVenues((records) => {
            rawRecords = records ?? {};
            venues = mapVenueRecords(records);
            emit();
          });

          unsubscribe = typeof stop === 'function' ? stop : () => {};
        } catch (error) {
          console.warn('No se pudo iniciar la escucha de lugares.', error);
        }
      })
      .catch((error) => {
        console.warn('No se pudo iniciar la sincronización de lugares.', error);
      });

  const subscribe = (listener) => {
    listeners.add(listener);
    listener({ venues: venues.map((venue) => ({ ...venue })), raw: { ...rawRecords } });

    return () => {
      listeners.delete(listener);
    };
  };

  const addVenue = (payload) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.addVenue !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.addVenue(payload);
    });

  const updateVenue = (venueId, changes) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.updateVenue !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.updateVenue(venueId, changes);
    });

  const deleteVenue = (venueId) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.deleteVenue !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.deleteVenue(venueId);
    });

  const exportCSV = (records, filters) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.exportVenuesCSV !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.exportVenuesCSV(records, filters);
    });

  const destroy = () => {
    try {
      unsubscribe();
    } catch (error) {
      console.warn('No se pudo detener la escucha de lugares.', error);
    }

    unsubscribe = () => {};
    listeners.clear();
  };

  const getSnapshot = () => ({
    venues: venues.map((venue) => ({ ...venue })),
    raw: { ...rawRecords },
  });

  return {
    init,
    subscribe,
    addVenue,
    updateVenue,
    deleteVenue,
    exportCSV,
    destroy,
    getSnapshot,
  };
};

const venuesStore = createVenuesStore();

const createVenueEditor = () => {
  let container = null;
  let dialog = null;
  let form = null;
  let fields = {};
  let titleElement = null;
  let subtitleElement = null;
  let closeButton = null;
  let cancelButton = null;
  let submitButton = null;
  let lastActiveElement = null;
  let currentVenueId = null;
  let isSaving = false;

  const resetFormValues = () => {
    if (!form || !fields) {
      return;
    }

    form.reset();

    Object.entries(fields).forEach(([key, input]) => {
      if (!input) {
        return;
      }

      if (key === 'status') {
        input.value = VENUE_DEFAULT_STATUS;
        return;
      }

      input.value = '';
    });
  };

  const setSavingState = (saving) => {
    isSaving = saving;

    if (submitButton) {
      submitButton.disabled = saving;
      submitButton.textContent = saving ? 'Guardando…' : 'Guardar cambios';
    }

    if (cancelButton) {
      cancelButton.disabled = saving;
    }

    if (closeButton) {
      closeButton.disabled = saving;
    }
  };

  const close = () => {
    if (!container || isSaving) {
      return;
    }

    container.classList.remove('is-visible');
    container.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('venue-editor-open');

    resetFormValues();
    setSavingState(false);
    currentVenueId = null;

    if (subtitleElement) {
      subtitleElement.textContent = '';
    }

    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }

    lastActiveElement = null;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!currentVenueId || !fields.name) {
      return;
    }

    const name = sanitizeEntityText(fields.name.value);

    if (!name) {
      alert('El nombre es obligatorio.');
      fields.name.focus();
      return;
    }

    const address = sanitizeEntityText(fields.address ? fields.address.value : '');
    const mapsUrl = sanitizeVenueUrl(fields.maps ? fields.maps.value : '');
    const capacityValue = normalizeVenueCapacityValue(
      fields.capacity ? fields.capacity.value : '',
    );
    const priceValue = normalizeVenuePriceValue(fields.price ? fields.price.value : '');
    const dateValue = normalizeVenueDateValue(fields.date ? fields.date.value : '');
    const contact = sanitizeEntityText(fields.contact ? fields.contact.value : '');
    const notes = sanitizeEntityText(fields.notes ? fields.notes.value : '');
    const statusValue = normalizeVenueStatusValue(
      fields.status ? fields.status.value : VENUE_DEFAULT_STATUS,
    );

    fields.name.value = name;
    if (fields.address) {
      fields.address.value = address;
    }
    if (fields.maps) {
      fields.maps.value = mapsUrl;
    }
    if (fields.capacity) {
      fields.capacity.value = capacityValue !== null ? String(capacityValue) : '';
    }
    if (fields.price) {
      fields.price.value = priceValue !== null ? String(priceValue) : '';
    }
    if (fields.date) {
      fields.date.value = dateValue || '';
    }
    if (fields.contact) {
      fields.contact.value = contact;
    }
    if (fields.notes) {
      fields.notes.value = notes;
    }
    if (fields.status) {
      fields.status.value = statusValue;
    }

    setSavingState(true);

    const update = venuesStore.updateVenue(currentVenueId, {
      name,
      address,
      mapsUrl,
      capacity: capacityValue,
      price: priceValue,
      availableDate: dateValue || '',
      contact,
      notes,
      status: statusValue,
    });

    if (!update || typeof update.then !== 'function') {
      setSavingState(false);
      close();
      return;
    }

    update
      .then(() => {
        setSavingState(false);
        close();
      })
      .catch((error) => {
        setSavingState(false);
        console.error('No se pudo actualizar el lugar.', error);
        alert('No se pudo guardar los cambios. Inténtalo nuevamente.');
      });
  };

  const ensureElements = () => {
    if (container) {
      return;
    }

    container = document.createElement('div');
    container.className = 'venue-editor';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-hidden', 'true');
    container.setAttribute('aria-labelledby', 'venue-editor-title');
    container.setAttribute('aria-describedby', 'venue-editor-subtitle');

    const backdrop = document.createElement('div');
    backdrop.className = 'venue-editor__backdrop';

    dialog = document.createElement('div');
    dialog.className = 'venue-editor__dialog';
    dialog.setAttribute('role', 'document');

    const header = document.createElement('header');
    header.className = 'venue-editor__header';

    titleElement = document.createElement('h3');
    titleElement.className = 'venue-editor__title';
    titleElement.id = 'venue-editor-title';
    titleElement.textContent = 'Editar lugar';

    subtitleElement = document.createElement('p');
    subtitleElement.className = 'venue-editor__subtitle';
    subtitleElement.id = 'venue-editor-subtitle';
    subtitleElement.textContent = '';

    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'venue-editor__titles';
    titleWrapper.append(titleElement, subtitleElement);

    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'venue-editor__close';
    closeButton.textContent = 'Cerrar';

    header.append(titleWrapper, closeButton);

    form = document.createElement('form');
    form.className = 'venue-editor__form';
    form.setAttribute('autocomplete', 'off');
    form.setAttribute('aria-labelledby', 'venue-editor-title venue-editor-subtitle');
    form.noValidate = true;

    const fieldsWrapper = document.createElement('div');
    fieldsWrapper.className = 'venue-editor__fields';

    const createField = (id, labelText, control) => {
      const field = document.createElement('div');
      field.className = 'venue-editor__field form-field';

      const label = document.createElement('label');
      label.className = 'form-label';
      label.setAttribute('for', id);
      label.textContent = labelText;

      control.id = id;
      control.classList.add('form-control');

      field.append(label, control);
      return { field, control };
    };

    const nameField = createField('venue-editor-name', 'Nombre', document.createElement('input'));
    nameField.control.type = 'text';
    nameField.control.required = true;
    nameField.field.classList.add('venue-editor__field--full', 'form-field--full');
    fieldsWrapper.append(nameField.field);

    const addressField = createField(
      'venue-editor-address',
      'Dirección',
      document.createElement('input'),
    );
    addressField.control.type = 'text';
    fieldsWrapper.append(addressField.field);

    const mapsField = createField('venue-editor-maps', 'Enlace a Google Maps', document.createElement('input'));
    mapsField.control.type = 'url';
    fieldsWrapper.append(mapsField.field);

    const capacityField = createField(
      'venue-editor-capacity',
      'Capacidad',
      document.createElement('input'),
    );
    capacityField.control.type = 'number';
    capacityField.control.min = '0';
    capacityField.control.step = '1';
    capacityField.control.inputMode = 'numeric';
    fieldsWrapper.append(capacityField.field);

    const priceField = createField('venue-editor-price', 'Precio estimado', document.createElement('input'));
    priceField.control.type = 'number';
    priceField.control.min = '0';
    priceField.control.step = '1';
    priceField.control.inputMode = 'numeric';
    fieldsWrapper.append(priceField.field);

    const dateField = createField('venue-editor-date', 'Fecha disponible', document.createElement('input'));
    dateField.control.type = 'date';
    fieldsWrapper.append(dateField.field);

    const contactField = createField(
      'venue-editor-contact',
      'Contacto',
      document.createElement('input'),
    );
    contactField.control.type = 'text';
    fieldsWrapper.append(contactField.field);

    const notesControl = document.createElement('textarea');
    notesControl.rows = 3;
    notesControl.classList.add('form-control--textarea');
    const notesField = createField('venue-editor-notes', 'Notas', notesControl);
    notesField.field.classList.add('venue-editor__field--full', 'form-field--full');
    fieldsWrapper.append(notesField.field);

    const statusControl = document.createElement('select');
    VENUE_STATUS_OPTIONS.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      statusControl.append(optionElement);
    });
    const statusField = createField('venue-editor-status', 'Estado', statusControl);
    fieldsWrapper.append(statusField.field);

    form.append(fieldsWrapper);

    const actions = document.createElement('div');
    actions.className = 'venue-editor__actions';

    cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button button--ghost venue-editor__cancel';
    cancelButton.textContent = 'Cancelar';

    submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'button venue-editor__submit';
    submitButton.textContent = 'Guardar cambios';

    actions.append(cancelButton, submitButton);
    form.append(actions);

    dialog.append(header, form);
    container.append(backdrop, dialog);
    document.body.append(container);

    fields = {
      name: nameField.control,
      address: addressField.control,
      maps: mapsField.control,
      capacity: capacityField.control,
      price: priceField.control,
      date: dateField.control,
      contact: contactField.control,
      notes: notesField.control,
      status: statusField.control,
    };

    container.addEventListener('click', (event) => {
      if (event.target === container && !isSaving) {
        close();
      }
    });

    backdrop.addEventListener('click', () => {
      if (!isSaving) {
        close();
      }
    });

    closeButton.addEventListener('click', () => {
      close();
    });

    cancelButton.addEventListener('click', () => {
      close();
    });

    form.addEventListener('submit', handleSubmit);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && container.classList.contains('is-visible')) {
        event.preventDefault();
        close();
      }
    });
  };

  const open = (venue) => {
    if (!venue || !venue.id) {
      return;
    }

    ensureElements();

    if (!container || !fields.name) {
      return;
    }

    lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    currentVenueId = venue.id;

    fields.name.value = venue.name || '';
    if (fields.address) {
      fields.address.value = venue.address || '';
    }
    if (fields.maps) {
      fields.maps.value = venue.mapsUrl || '';
    }
    if (fields.capacity) {
      fields.capacity.value =
        typeof venue.capacity === 'number' && Number.isFinite(venue.capacity)
          ? String(venue.capacity)
          : '';
    }
    if (fields.price) {
      fields.price.value =
        typeof venue.price === 'number' && Number.isFinite(venue.price)
          ? String(venue.price)
          : '';
    }
    if (fields.date) {
      fields.date.value = normalizeVenueDateValue(venue.availableDate) || '';
    }
    if (fields.contact) {
      fields.contact.value = venue.contact || '';
    }
    if (fields.notes) {
      fields.notes.value = venue.notes || '';
    }
    if (fields.status) {
      fields.status.value = normalizeVenueStatusValue(venue.status);
    }

    if (subtitleElement) {
      subtitleElement.textContent = venue.name || '';
    }

    container.setAttribute('aria-hidden', 'false');
    container.classList.add('is-visible');
    document.body.classList.add('venue-editor-open');

    if (fields.name && typeof fields.name.focus === 'function') {
      fields.name.focus();
    }
  };

  return { open, close };
};

const venueEditor = createVenueEditor();

let venuesData = [];
let venuesRawRecords = {};
let stopVenuesSubscription = () => {};

const defaultVenuePreferences = {
  status: 'todas',
  capacityMin: '',
  capacityMax: '',
  sort: 'recent',
  search: '',
  view: 'cards',
};

const loadVenuePreferences = () => {
  try {
    const stored = localStorage.getItem(VENUE_STORAGE_KEY);

    if (!stored) {
      return { ...defaultVenuePreferences };
    }

    const parsed = JSON.parse(stored);

    return {
      status:
        typeof parsed.status === 'string' && parsed.status
          ? parsed.status
          : defaultVenuePreferences.status,
      capacityMin:
        typeof parsed.capacityMin === 'string' || typeof parsed.capacityMin === 'number'
          ? String(parsed.capacityMin)
          : defaultVenuePreferences.capacityMin,
      capacityMax:
        typeof parsed.capacityMax === 'string' || typeof parsed.capacityMax === 'number'
          ? String(parsed.capacityMax)
          : defaultVenuePreferences.capacityMax,
      sort:
        typeof parsed.sort === 'string' && parsed.sort
          ? parsed.sort
          : defaultVenuePreferences.sort,
      search:
        typeof parsed.search === 'string'
          ? parsed.search
          : defaultVenuePreferences.search,
      view:
        parsed.view === 'table' ? 'table' : defaultVenuePreferences.view,
    };
  } catch (error) {
    console.warn('No se pudo cargar las preferencias de lugares.', error);
    return { ...defaultVenuePreferences };
  }
};

const venuePreferences = loadVenuePreferences();

const normalizeCapacityFilterValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.max(0, Math.trunc(value)));
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return '';
  }

  return String(parsed);
};

const venueFiltersState = {
  status: venuePreferences.status,
  capacityMin: normalizeCapacityFilterValue(venuePreferences.capacityMin),
  capacityMax: normalizeCapacityFilterValue(venuePreferences.capacityMax),
  sort: venuePreferences.sort,
  search: venuePreferences.search,
};

let venueViewMode = venuePreferences.view === 'table' ? 'table' : 'cards';

const VENUE_FILTER_STATUS_VALUES = new Set([
  'todas',
  ...VENUE_STATUS_OPTIONS.map((option) => option.value),
]);

if (!VENUE_FILTER_STATUS_VALUES.has(venueFiltersState.status)) {
  venueFiltersState.status = 'todas';
}

const VENUE_SORT_KEYS = ['recent', 'price-asc', 'price-desc', 'capacity-asc', 'capacity-desc'];

if (!VENUE_SORT_KEYS.includes(venueFiltersState.sort)) {
  venueFiltersState.sort = 'recent';
}

const persistVenuePreferences = () => {
  try {
    const payload = {
      status: venueFiltersState.status,
      capacityMin: venueFiltersState.capacityMin,
      capacityMax: venueFiltersState.capacityMax,
      sort: venueFiltersState.sort,
      search: venueFiltersState.search,
      view: venueViewMode,
    };

    localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('No se pudo guardar las preferencias de lugares.', error);
  }
};

const applyVenueFilters = (items) => {
  const statusFilter = venueFiltersState.status;
  const minFilter = Number.parseInt(venueFiltersState.capacityMin, 10);
  const maxFilter = Number.parseInt(venueFiltersState.capacityMax, 10);
  const hasMin = Number.isFinite(minFilter);
  const hasMax = Number.isFinite(maxFilter);
  const searchTerm = venueFiltersState.search ? venueFiltersState.search.trim().toLowerCase() : '';

  return items.filter((venue) => {
    if (statusFilter && statusFilter !== 'todas' && venue.status !== statusFilter) {
      return false;
    }

    if (hasMin) {
      const capacity = typeof venue.capacity === 'number' && Number.isFinite(venue.capacity)
        ? venue.capacity
        : null;

      if (capacity === null || capacity < minFilter) {
        return false;
      }
    }

    if (hasMax) {
      const capacity = typeof venue.capacity === 'number' && Number.isFinite(venue.capacity)
        ? venue.capacity
        : null;

      if (capacity === null || capacity > maxFilter) {
        return false;
      }
    }

    if (searchTerm) {
      const nameMatch = venue.name.toLowerCase().includes(searchTerm);
      const addressMatch = (venue.address || '').toLowerCase().includes(searchTerm);

      if (!nameMatch && !addressMatch) {
        return false;
      }
    }

    return true;
  });
};

const compareVenueNumeric = (first, second, direction) => {
  const firstValue = typeof first === 'number' && Number.isFinite(first) ? first : null;
  const secondValue = typeof second === 'number' && Number.isFinite(second) ? second : null;

  if (firstValue === null && secondValue === null) {
    return 0;
  }

  if (firstValue === null) {
    return direction === 'asc' ? 1 : -1;
  }

  if (secondValue === null) {
    return direction === 'asc' ? -1 : 1;
  }

  return direction === 'asc' ? firstValue - secondValue : secondValue - firstValue;
};

const sortVenues = (items, sortKey) => {
  const list = [...items];

  switch (sortKey) {
    case 'price-asc':
      list.sort((first, second) => compareVenueNumeric(first.price, second.price, 'asc'));
      break;
    case 'price-desc':
      list.sort((first, second) => compareVenueNumeric(first.price, second.price, 'desc'));
      break;
    case 'capacity-asc':
      list.sort((first, second) => compareVenueNumeric(first.capacity, second.capacity, 'asc'));
      break;
    case 'capacity-desc':
      list.sort((first, second) => compareVenueNumeric(first.capacity, second.capacity, 'desc'));
      break;
    default:
      list.sort((first, second) => {
        const firstTime =
          typeof first.updatedAt === 'number'
            ? first.updatedAt
            : typeof first.createdAt === 'number'
            ? first.createdAt
            : 0;
        const secondTime =
          typeof second.updatedAt === 'number'
            ? second.updatedAt
            : typeof second.createdAt === 'number'
            ? second.createdAt
            : 0;

        return secondTime - firstTime;
      });
      break;
  }

  return list;
};

const getVisibleVenues = () => {
  const filtered = applyVenueFilters(venuesData);
  return sortVenues(filtered, venueFiltersState.sort);
};

const getVenueById = (venueId) => venuesData.find((venue) => venue.id === venueId) || null;

const renderVenueSummary = () => {
  const total = venuesData.length;
  const favorites = venuesData.filter((venue) => venue.status === 'favorito').length;
  const pending = venuesData.filter((venue) => venue.status === 'pendiente').length;

  const priceValues = venuesData
    .map((venue) => (typeof venue.price === 'number' && Number.isFinite(venue.price) ? venue.price : null))
    .filter((value) => value !== null);

  const averagePrice = priceValues.length
    ? priceValues.reduce((sum, value) => sum + (value ?? 0), 0) / priceValues.length
    : null;

  const medianPrice = priceValues.length
    ? (() => {
        const sorted = priceValues.slice().sort((first, second) => first - second);
        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
          return (sorted[middle - 1] + sorted[middle]) / 2;
        }

        return sorted[middle];
      })()
    : null;

  if (venueSummaryElements.total) {
    venueSummaryElements.total.textContent = String(total);
  }

  if (venueSummaryElements.favorites) {
    venueSummaryElements.favorites.textContent = String(favorites);
  }

  if (venueSummaryElements.pending) {
    venueSummaryElements.pending.textContent = String(pending);
  }

  if (venueSummaryElements.average) {
    venueSummaryElements.average.textContent =
      averagePrice !== null ? formatVenuePrice(averagePrice) || '—' : '—';
  }

  if (venueSummaryElements.median) {
    venueSummaryElements.median.textContent =
      medianPrice !== null ? formatVenuePrice(medianPrice) || '—' : '—';
  }
};

const createVenueQuickField = (venue, { label, field, value, step = '1', type = 'number' }) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'venue-card__quick-field';

  const title = document.createElement('span');
  title.textContent = label;
  wrapper.append(title);

  const input = document.createElement('input');
  input.className = 'venue-card__quick-input';
  input.dataset.field = field;
  input.value = value || '';
  input.setAttribute('aria-label', `${label} de ${venue.name}`);

  if (type === 'date') {
    input.type = 'date';
  } else {
    input.type = 'number';
    input.min = '0';
    input.step = step;
    input.inputMode = 'numeric';
  }

  wrapper.append(input);
  return wrapper;
};

const createVenueCard = (venue) => {
  const card = document.createElement('article');
  card.className = 'venue-card';
  card.dataset.id = venue.id;

  const header = document.createElement('header');
  header.className = 'venue-card__header';

  const title = document.createElement('h3');
  title.className = 'venue-card__title';
  title.textContent = venue.name;
  header.append(title);

  const badges = document.createElement('div');
  badges.className = 'venue-card__badges';

  const statusBadge = document.createElement('span');
  statusBadge.className = `venue-card__badge venue-card__badge--${venue.status}`;
  statusBadge.textContent = VENUE_STATUS_LABELS[venue.status] || venue.status;
  badges.append(statusBadge);

  if (typeof venue.capacity === 'number' && Number.isFinite(venue.capacity)) {
    const capacityBadge = document.createElement('span');
    capacityBadge.className = 'venue-card__badge venue-card__badge--capacity';
    capacityBadge.textContent = `Capacidad: ${venue.capacity}`;
    badges.append(capacityBadge);
  }

  if (typeof venue.price === 'number' && Number.isFinite(venue.price)) {
    const priceBadge = document.createElement('span');
    priceBadge.className = 'venue-card__badge venue-card__badge--price';
    priceBadge.textContent = formatVenuePrice(venue.price);
    badges.append(priceBadge);
  }

  header.append(badges);
  card.append(header);

  const meta = document.createElement('div');
  meta.className = 'venue-card__meta';

  if (venue.address) {
    const address = document.createElement('p');
    address.className = 'venue-card__address';
    address.textContent = venue.address;
    meta.append(address);
  }

  const formattedDate = formatVenueDate(venue.availableDate);

  if (formattedDate) {
    const date = document.createElement('p');
    date.textContent = `Próxima fecha: ${formattedDate}`;
    meta.append(date);
  }

  if (venue.mapsUrl) {
    const mapsButton = document.createElement('button');
    mapsButton.type = 'button';
    mapsButton.className = 'venue-card__button';
    mapsButton.dataset.action = 'open-maps';
    mapsButton.dataset.url = venue.mapsUrl;
    mapsButton.textContent = 'Abrir en Maps';
    meta.append(mapsButton);
  }

  if (meta.childElementCount > 0) {
    card.append(meta);
  }

  const info = document.createElement('div');
  info.className = 'venue-card__info';

  if (venue.contact) {
    const contact = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Contacto: ';
    contact.append(strong, document.createTextNode(venue.contact));
    info.append(contact);
  }

  if (venue.notes) {
    const notes = document.createElement('p');
    notes.className = 'venue-card__notes';
    notes.textContent = venue.notes;
    info.append(notes);
  }

  if (info.childElementCount > 0) {
    card.append(info);
  }

  const quick = document.createElement('div');
  quick.className = 'venue-card__quick';

  quick.append(
    createVenueQuickField(venue, {
      label: 'Capacidad',
      field: 'capacity',
      value:
        typeof venue.capacity === 'number' && Number.isFinite(venue.capacity)
          ? String(venue.capacity)
          : '',
    }),
  );

  quick.append(
    createVenueQuickField(venue, {
      label: 'Precio estimado',
      field: 'price',
      value:
        typeof venue.price === 'number' && Number.isFinite(venue.price)
          ? String(venue.price)
          : '',
      step: '1',
    }),
  );

  quick.append(
    createVenueQuickField(venue, {
      label: 'Fecha disponible',
      field: 'availableDate',
      value: normalizeVenueDateValue(venue.availableDate) || '',
      type: 'date',
    }),
  );

  card.append(quick);

  const actions = document.createElement('div');
  actions.className = 'venue-card__actions';

  const statusGroup = document.createElement('div');
  statusGroup.className = 'venue-card__status-group';

  const favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.className = 'venue-card__button';
  favoriteButton.dataset.action = 'toggle-favorite';
  favoriteButton.textContent = 'Favorito';
  if (venue.status === 'favorito') {
    favoriteButton.classList.add('is-active');
  }
  statusGroup.append(favoriteButton);

  const visitedButton = document.createElement('button');
  visitedButton.type = 'button';
  visitedButton.className = 'venue-card__button';
  visitedButton.dataset.action = 'set-status';
  visitedButton.dataset.status = 'visitado';
  visitedButton.textContent = 'Visitado';
  statusGroup.append(visitedButton);

  const pendingButton = document.createElement('button');
  pendingButton.type = 'button';
  pendingButton.className = 'venue-card__button';
  pendingButton.dataset.action = 'set-status';
  pendingButton.dataset.status = 'pendiente';
  pendingButton.textContent = 'Pendiente';
  statusGroup.append(pendingButton);

  const discardButton = document.createElement('button');
  discardButton.type = 'button';
  discardButton.className = 'venue-card__button venue-card__button--danger';
  discardButton.dataset.action = 'set-status';
  discardButton.dataset.status = 'descartado';
  discardButton.textContent = 'Descartar';
  statusGroup.append(discardButton);

  actions.append(statusGroup);

  const manageGroup = document.createElement('div');
  manageGroup.className = 'venue-card__status-group';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'venue-card__button';
  editButton.dataset.action = 'edit';
  editButton.textContent = 'Editar';
  manageGroup.append(editButton);

  if (venue.mapsUrl) {
    const mapsButton = document.createElement('button');
    mapsButton.type = 'button';
    mapsButton.className = 'venue-card__button';
    mapsButton.dataset.action = 'open-maps';
    mapsButton.dataset.url = venue.mapsUrl;
    mapsButton.textContent = 'Maps';
    manageGroup.append(mapsButton);
  }

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'venue-card__button venue-card__button--danger';
  deleteButton.dataset.action = 'delete';
  deleteButton.textContent = 'Borrar';
  manageGroup.append(deleteButton);

  actions.append(manageGroup);
  card.append(actions);

  return card;
};

const createVenueTableButton = (label, action, { status, isDanger = false, isActive = false, url } = {}) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'venue-table__button';
  button.dataset.action = action;
  if (status) {
    button.dataset.status = status;
  }
  if (url) {
    button.dataset.url = url;
  }
  if (isDanger) {
    button.classList.add('venue-table__button--danger');
  }
  if (isActive) {
    button.classList.add('is-active');
  }
  button.textContent = label;
  return button;
};

const createVenueTableRow = (venue) => {
  const row = document.createElement('tr');
  row.dataset.id = venue.id;

  const nameCell = document.createElement('td');
  nameCell.className = 'venue-table__name';
  nameCell.textContent = venue.name;
  if (venue.address) {
    const address = document.createElement('div');
    address.className = 'venue-table__notes';
    address.textContent = venue.address;
    nameCell.append(address);
  }
  row.append(nameCell);

  const capacityCell = document.createElement('td');
  const capacityInput = document.createElement('input');
  capacityInput.type = 'number';
  capacityInput.min = '0';
  capacityInput.step = '1';
  capacityInput.inputMode = 'numeric';
  capacityInput.className = 'venue-table__quick-input';
  capacityInput.dataset.field = 'capacity';
  capacityInput.value =
    typeof venue.capacity === 'number' && Number.isFinite(venue.capacity)
      ? String(venue.capacity)
      : '';
  capacityInput.setAttribute('aria-label', `Capacidad de ${venue.name}`);
  capacityCell.append(capacityInput);
  row.append(capacityCell);

  const priceCell = document.createElement('td');
  const priceInput = document.createElement('input');
  priceInput.type = 'number';
  priceInput.min = '0';
  priceInput.step = '1';
  priceInput.inputMode = 'numeric';
  priceInput.className = 'venue-table__quick-input';
  priceInput.dataset.field = 'price';
  priceInput.value =
    typeof venue.price === 'number' && Number.isFinite(venue.price)
      ? String(venue.price)
      : '';
  priceInput.setAttribute('aria-label', `Precio estimado de ${venue.name}`);
  priceCell.append(priceInput);
  row.append(priceCell);

  const statusCell = document.createElement('td');
  const statusSelect = document.createElement('select');
  statusSelect.className = 'venue-table__status';
  statusSelect.dataset.action = 'status-select';
  statusSelect.setAttribute('aria-label', `Estado de ${venue.name}`);
  VENUE_STATUS_OPTIONS.forEach((option) => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    statusSelect.append(optionElement);
  });
  statusSelect.value = venue.status;
  statusCell.append(statusSelect);
  row.append(statusCell);

  const dateCell = document.createElement('td');
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'venue-table__quick-input';
  dateInput.dataset.field = 'availableDate';
  dateInput.value = normalizeVenueDateValue(venue.availableDate) || '';
  dateInput.setAttribute('aria-label', `Fecha disponible de ${venue.name}`);
  dateCell.append(dateInput);
  row.append(dateCell);

  const contactCell = document.createElement('td');
  contactCell.textContent = venue.contact || '—';
  if (venue.notes) {
    const notes = document.createElement('div');
    notes.className = 'venue-table__notes';
    notes.textContent = venue.notes;
    contactCell.append(notes);
  }
  row.append(contactCell);

  const actionsCell = document.createElement('td');
  actionsCell.className = 'venue-table__actions';

  const favoriteButton = createVenueTableButton('Favorito', 'toggle-favorite', {
    isActive: venue.status === 'favorito',
  });

  const visitedButton = createVenueTableButton('Visitado', 'set-status', {
    status: 'visitado',
  });

  const pendingButton = createVenueTableButton('Pendiente', 'set-status', {
    status: 'pendiente',
  });

  const discardButton = createVenueTableButton('Descartar', 'set-status', {
    status: 'descartado',
    isDanger: true,
  });

  const editButton = createVenueTableButton('Editar', 'edit');
  const mapsButton = venue.mapsUrl
    ? createVenueTableButton('Maps', 'open-maps', { url: venue.mapsUrl })
    : null;
  const deleteButton = createVenueTableButton('Borrar', 'delete', {
    isDanger: true,
  });

  actionsCell.append(favoriteButton, visitedButton, pendingButton, discardButton, editButton);

  if (mapsButton) {
    actionsCell.append(mapsButton);
  }

  actionsCell.append(deleteButton);
  row.append(actionsCell);

  return row;
};

const renderVenueCards = (items) => {
  if (!venuesGrid) {
    return;
  }

  venuesGrid.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'venues-empty';
    empty.textContent = venuesData.length
      ? 'No hay lugares que coincidan con los filtros.'
      : 'Añade lugares para comenzar.';
    venuesGrid.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((venue) => {
    fragment.append(createVenueCard(venue));
  });
  venuesGrid.append(fragment);
};

const renderVenueTable = (items) => {
  if (!venuesTableBody) {
    return;
  }

  venuesTableBody.innerHTML = '';

  if (!items.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'venue-table__empty';
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = venuesData.length
      ? 'No hay lugares que coincidan con los filtros.'
      : 'Añade lugares para comenzar.';
    emptyRow.append(cell);
    venuesTableBody.append(emptyRow);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((venue) => {
    fragment.append(createVenueTableRow(venue));
  });
  venuesTableBody.append(fragment);
};

const updateVenueViewToggle = () => {
  if (venueViewCardsButton) {
    venueViewCardsButton.classList.toggle('is-active', venueViewMode === 'cards');
  }

  if (venueViewTableButton) {
    venueViewTableButton.classList.toggle('is-active', venueViewMode === 'table');
  }
};

const renderVenues = () => {
  const visible = getVisibleVenues();
  const isCardsView = venueViewMode === 'cards';

  if (venuesGrid) {
    venuesGrid.hidden = !isCardsView;
    if (isCardsView) {
      renderVenueCards(visible);
    }
  }

  if (venuesTableWrapper) {
    venuesTableWrapper.hidden = isCardsView;
    if (!isCardsView) {
      renderVenueTable(visible);
    }
  }
};

const setVenueViewMode = (nextView) => {
  if (nextView !== 'cards' && nextView !== 'table') {
    return;
  }

  if (venueViewMode === nextView) {
    return;
  }

  venueViewMode = nextView;
  updateVenueViewToggle();
  persistVenuePreferences();
  renderVenues();
};

const updateVenueField = (venueId, field, value) => {
  const update = venuesStore.updateVenue(venueId, { [field]: value });

  if (update && typeof update.catch === 'function') {
    update.catch((error) => {
      console.error('No se pudo actualizar el lugar.', error);
      alert('No se pudo actualizar el lugar. Inténtalo nuevamente.');
    });
  }
};

const handleVenueQuickInputChange = (input) => {
  const container = input.closest('[data-id]');

  if (!container) {
    return;
  }

  const venueId = container.dataset.id;
  const field = input.dataset.field;

  if (!venueId || !field) {
    return;
  }

  let normalizedValue = null;
  let displayValue = input.value;

  if (field === 'capacity') {
    const parsed = normalizeVenueCapacityValue(input.value);
    normalizedValue = parsed;
    displayValue = parsed === null ? '' : String(parsed);
  } else if (field === 'price') {
    const parsed = normalizeVenuePriceValue(input.value);
    normalizedValue = parsed;
    displayValue = parsed === null ? '' : String(parsed);
  } else if (field === 'availableDate') {
    const parsed = normalizeVenueDateValue(input.value);
    normalizedValue = parsed;
    displayValue = parsed || '';
  } else {
    return;
  }

  input.value = displayValue;
  updateVenueField(venueId, field, normalizedValue);
};

const handleVenueStatusUpdate = (venueId, status) => {
  if (!venueId || !status) {
    return;
  }

  updateVenueField(venueId, 'status', normalizeVenueStatusValue(status));
};

const handleVenueFavoriteToggle = (venueId) => {
  const venue = getVenueById(venueId);

  if (!venue) {
    return;
  }

  const nextStatus = venue.status === 'favorito' ? 'pendiente' : 'favorito';
  handleVenueStatusUpdate(venueId, nextStatus);
};

const handleVenueDelete = (venueId) => {
  if (!venueId) {
    return;
  }

  const confirmed = window.confirm('¿Quieres eliminar este lugar?');

  if (!confirmed) {
    return;
  }

  const removal = venuesStore.deleteVenue(venueId);

  if (removal && typeof removal.catch === 'function') {
    removal.catch((error) => {
      console.error('No se pudo eliminar el lugar.', error);
      alert('No se pudo eliminar el lugar. Inténtalo nuevamente.');
    });
  }
};

const handleVenueExport = () => {
  const visible = getVisibleVenues();
  const appliedFilters = {
    status: venueFiltersState.status,
    capacityMin: venueFiltersState.capacityMin,
    capacityMax: venueFiltersState.capacityMax,
    sort: venueFiltersState.sort,
    search: venueFiltersState.search,
  };

  const exportAction = venuesStore.exportCSV(
    visible.map((venue) => ({ ...venue })),
    appliedFilters,
  );

  if (!exportAction || typeof exportAction.then !== 'function') {
    return;
  }

  exportAction
    .then((csv) => {
      if (!csv) {
        alert('No hay datos para exportar todavía.');
        return;
      }

      const filename = `lugares-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(csv, filename);
    })
    .catch((error) => {
      console.error('No se pudo exportar los lugares.', error);
      alert('No se pudo exportar los lugares. Inténtalo nuevamente.');
    });
};

const handleVenueFormSubmit = (event) => {
  event.preventDefault();

  if (!venueForm) {
    return;
  }

  const payload = {
    name: venueNameInput ? venueNameInput.value : '',
    address: venueAddressInput ? venueAddressInput.value : '',
    mapsUrl: venueMapsInput ? sanitizeVenueUrl(venueMapsInput.value) : '',
    capacity: venueCapacityInput ? venueCapacityInput.value : '',
    price: venuePriceInput ? venuePriceInput.value : '',
    availableDate: venueDateInput ? venueDateInput.value : '',
    contact: venueContactInput ? venueContactInput.value : '',
    notes: venueNotesInput ? venueNotesInput.value : '',
    status: venueStatusSelect ? venueStatusSelect.value : VENUE_DEFAULT_STATUS,
  };

  const addition = venuesStore.addVenue(payload);

  venueForm.reset();

  if (venueStatusSelect) {
    venueStatusSelect.value = VENUE_DEFAULT_STATUS;
  }

  if (venueNameInput) {
    venueNameInput.focus();
  }

  if (addition && typeof addition.catch === 'function') {
    addition.catch((error) => {
      console.error('No se pudo guardar el lugar.', error);
      alert('No se pudo guardar el lugar. Revisa tu conexión e inténtalo nuevamente.');
    });
  }
};

const handleVenueCardChange = (event) => {
  const target = event.target instanceof HTMLInputElement ? event.target : null;

  if (!target) {
    return;
  }

  if (target.matches('.venue-card__quick-input')) {
    handleVenueQuickInputChange(target);
  }
};

const handleVenueCardClick = (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;

  if (!target) {
    return;
  }

  const actionButton = target.closest('[data-action]');

  if (!actionButton) {
    return;
  }

  const card = actionButton.closest('.venue-card');

  if (!card) {
    return;
  }

  const venueId = card.dataset.id;

  if (!venueId) {
    return;
  }

  const action = actionButton.dataset.action;

  if (action === 'toggle-favorite') {
    handleVenueFavoriteToggle(venueId);
    return;
  }

  if (action === 'set-status') {
    handleVenueStatusUpdate(venueId, actionButton.dataset.status || '');
    return;
  }

  if (action === 'delete') {
    handleVenueDelete(venueId);
    return;
  }

  if (action === 'open-maps') {
    const venue = getVenueById(venueId);
    const url = actionButton.dataset.url || (venue ? venue.mapsUrl : '');

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    return;
  }

  if (action === 'edit') {
    const venue = getVenueById(venueId);

    if (venue) {
      venueEditor.open(venue);
    }
  }
};

const handleVenueTableChange = (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.matches('.venue-table__quick-input')) {
    handleVenueQuickInputChange(target);
    return;
  }

  if (target instanceof HTMLSelectElement && target.matches('.venue-table__status')) {
    const row = target.closest('tr');

    if (!row) {
      return;
    }

    const venueId = row.dataset.id;

    if (!venueId) {
      return;
    }

    handleVenueStatusUpdate(venueId, target.value);
  }
};

const handleVenueTableClick = (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;

  if (!target) {
    return;
  }

  const actionButton = target.closest('[data-action]');

  if (!actionButton) {
    return;
  }

  const row = actionButton.closest('tr');

  if (!row) {
    return;
  }

  const venueId = row.dataset.id;

  if (!venueId) {
    return;
  }

  const action = actionButton.dataset.action;

  if (action === 'toggle-favorite') {
    handleVenueFavoriteToggle(venueId);
    return;
  }

  if (action === 'set-status') {
    handleVenueStatusUpdate(venueId, actionButton.dataset.status || '');
    return;
  }

  if (action === 'delete') {
    handleVenueDelete(venueId);
    return;
  }

  if (action === 'open-maps') {
    const venue = getVenueById(venueId);
    const url = actionButton.dataset.url || (venue ? venue.mapsUrl : '');

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    return;
  }

  if (action === 'edit') {
    const venue = getVenueById(venueId);

    if (venue) {
      venueEditor.open(venue);
    }
  }
};

const initializeVenuesSection = () => {
  if (!venuesGrid || !venuesTableWrapper) {
    return;
  }

  if (venueForm) {
    venueForm.addEventListener('submit', handleVenueFormSubmit);
  }

  const updateAndRender = () => {
    persistVenuePreferences();
    renderVenues();
  };

  if (venueStatusFilter) {
    const initialStatus = VENUE_FILTER_STATUS_VALUES.has(venueFiltersState.status)
      ? venueFiltersState.status
      : 'todas';
    venueFiltersState.status = initialStatus;
    venueStatusFilter.value = initialStatus;

    venueStatusFilter.addEventListener('change', (event) => {
      const value = event.target.value;
      venueFiltersState.status = VENUE_FILTER_STATUS_VALUES.has(value)
        ? value
        : 'todas';
      venueStatusFilter.value = venueFiltersState.status;
      updateAndRender();
    });
  }

  const handleCapacityFilter = (input, key) => {
    if (!input) {
      return;
    }

    const initialValue = normalizeCapacityFilterValue(venueFiltersState[key]);
    venueFiltersState[key] = initialValue;
    input.value = initialValue;

    input.addEventListener('input', (event) => {
      const rawValue = typeof event.target.value === 'string' ? event.target.value : '';
      const normalized = normalizeCapacityFilterValue(rawValue);

      if (event.target.value !== normalized) {
        event.target.value = normalized;
      }

      venueFiltersState[key] = normalized;
      updateAndRender();
    });
  };

  handleCapacityFilter(venueCapacityMinInput, 'capacityMin');
  handleCapacityFilter(venueCapacityMaxInput, 'capacityMax');

  if (venueSortSelect) {
    const initialSort = VENUE_SORT_KEYS.includes(venueFiltersState.sort)
      ? venueFiltersState.sort
      : 'recent';
    venueFiltersState.sort = initialSort;
    venueSortSelect.value = initialSort;

    venueSortSelect.addEventListener('change', (event) => {
      const value = event.target.value;
      venueFiltersState.sort = VENUE_SORT_KEYS.includes(value) ? value : 'recent';
      venueSortSelect.value = venueFiltersState.sort;
      updateAndRender();
    });
  }

  if (venueSearchInput) {
    venueSearchInput.value = venueFiltersState.search || '';

    venueSearchInput.addEventListener('input', (event) => {
      const value = typeof event.target.value === 'string' ? event.target.value : '';
      venueFiltersState.search = value;
      updateAndRender();
    });
  }

  if (venueViewCardsButton) {
    venueViewCardsButton.addEventListener('click', () => {
      setVenueViewMode('cards');
    });
  }

  if (venueViewTableButton) {
    venueViewTableButton.addEventListener('click', () => {
      setVenueViewMode('table');
    });
  }

  updateVenueViewToggle();

  if (venueExportButton) {
    venueExportButton.addEventListener('click', handleVenueExport);
  }

  venuesGrid.addEventListener('change', handleVenueCardChange);
  venuesGrid.addEventListener('click', handleVenueCardClick);

  if (venuesTableBody) {
    venuesTableBody.addEventListener('change', handleVenueTableChange);
    venuesTableBody.addEventListener('click', handleVenueTableClick);
  }

  stopVenuesSubscription();
  stopVenuesSubscription = venuesStore.subscribe(({ venues, raw }) => {
    venuesData = venues;
    venuesRawRecords = raw;
    renderVenueSummary();
    renderVenues();
  });

  venuesStore.init();

  renderVenueSummary();
  renderVenues();

  return stopVenuesSubscription;
};

// Presupuesto
const budgetTargetForm = document.getElementById('budget-target-form');
const budgetTargetInput = document.getElementById('budget-target');
const budgetTargetValue = document.getElementById('budget-target-value');
const budgetEstimatedValue = document.getElementById('budget-estimated');
const budgetActualValue = document.getElementById('budget-actual');
const budgetPaidValue = document.getElementById('budget-paid');
const budgetPaidPercentValue = document.getElementById('budget-paid-percent');
const budgetDiffValue = document.getElementById('budget-diff');

const budgetItemForm = document.getElementById('budget-item-form');
const budgetTitleInput = document.getElementById('budget-title');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetEstimateInput = document.getElementById('budget-estimate');
const budgetActualInput = document.getElementById('budget-actual-input');
const budgetProviderInput = document.getElementById('budget-provider');
const budgetDateInput = document.getElementById('budget-date');

const budgetCategoryFilter = document.getElementById('budget-category-filter');
const budgetPaidFilter = document.getElementById('budget-paid-filter');
const budgetTableBody = document.getElementById('budget-table-body');

const toAmount = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.parseFloat(value.toFixed(2));
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '.');
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) {
      return Number.parseFloat(parsed.toFixed(2));
    }
  }

  return 0;
};

const normalizeBudgetItem = (id, record) => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const title = sanitizeEntityText(record.title);

  if (!title) {
    return null;
  }

  const category = sanitizeEntityText(record.category) || 'General';
  const dueDate = sanitizeEntityText(record.dueDate);

  return {
    id,
    title,
    category,
    est: toAmount(record.est),
    act: toAmount(record.act),
    paid: Boolean(record.paid),
    dueDate,
    provider: sanitizeEntityText(record.provider),
    createdAt: toTimestamp(record.createdAt),
    updatedAt: toTimestamp(record.updatedAt),
  };
};

const getDueDateTimestamp = (value) => {
  const normalized = normalizeDueDate(value);

  if (!normalized) {
    return Number.POSITIVE_INFINITY;
  }

  const [year, month, day] = normalized.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(year, month - 1, day);
  return date.getTime();
};

const mapBudgetItems = (records) =>
  Object.entries(records ?? {})
    .map(([id, value]) => normalizeBudgetItem(id, value))
    .filter((value) => value !== null)
    .sort((first, second) => {
      const firstDue = getDueDateTimestamp(first.dueDate);
      const secondDue = getDueDateTimestamp(second.dueDate);

      if (firstDue !== secondDue) {
        return firstDue - secondDue;
      }

      const firstCreated = typeof first.createdAt === 'number' ? first.createdAt : 0;
      const secondCreated = typeof second.createdAt === 'number' ? second.createdAt : 0;

      return firstCreated - secondCreated;
    });

const createBudgetStore = () => {
  let sync = null;
  let unsubscribe = () => {};
  let targetValue = 0;
  let items = [];
  let rawItems = {};
  const listeners = new Set();

  const emit = () => {
    const snapshot = {
      target: targetValue,
      items: items.map((item) => ({ ...item })),
      rawItems: { ...rawItems },
    };
    listeners.forEach((listener) => listener(snapshot));
  };

  const ensureSync = async () => {
    if (sync) {
      return sync;
    }

    const instance = await waitForFirebaseSync();
    if (!instance) {
      throw new Error('SYNC_UNAVAILABLE');
    }

    sync = instance;
    return sync;
  };

  const init = () =>
    ensureSync()
      .then((instance) => {
        if (!instance || typeof instance.listenBudget !== 'function') {
          return;
        }

        unsubscribe();
        unsubscribe = () => {};

        try {
          const stop = instance.listenBudget((data) => {
            const meta = data && typeof data.meta === 'object' ? data.meta : {};
            rawItems = data && typeof data.items === 'object' ? data.items : {};
            items = mapBudgetItems(rawItems);

            const numericTarget = Number.parseFloat(meta.target);
            targetValue = Number.isFinite(numericTarget) ? numericTarget : 0;
            emit();
          });

          unsubscribe = typeof stop === 'function' ? stop : () => {};
        } catch (error) {
          console.warn('No se pudo iniciar la escucha del presupuesto.', error);
        }
      })
      .catch((error) => {
        console.warn('No se pudo iniciar la sincronización del presupuesto.', error);
      });

  const subscribe = (listener) => {
    listeners.add(listener);
    listener({
      target: targetValue,
      items: items.map((item) => ({ ...item })),
      rawItems: { ...rawItems },
    });

    return () => {
      listeners.delete(listener);
    };
  };

  const setTarget = (value) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.setBudgetTarget !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.setBudgetTarget(value);
    });

  const addItem = (payload) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.addBudgetItem !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.addBudgetItem(payload);
    });

  const updateItem = (itemId, changes) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.updateBudgetItem !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.updateBudgetItem(itemId, changes);
    });

  const deleteItem = (itemId) =>
    ensureSync().then((instance) => {
      if (!instance || typeof instance.deleteBudgetItem !== 'function') {
        throw new Error('SYNC_UNAVAILABLE');
      }

      return instance.deleteBudgetItem(itemId);
    });

  const destroy = () => {
    try {
      unsubscribe();
    } catch (error) {
      console.warn('No se pudo detener la escucha del presupuesto.', error);
    }
    unsubscribe = () => {};
    listeners.clear();
  };

  const getSnapshot = () => ({
    target: targetValue,
    items: items.map((item) => ({ ...item })),
    rawItems: { ...rawItems },
  });

  return {
    init,
    subscribe,
    setTarget,
    addItem,
    updateItem,
    deleteItem,
    destroy,
    getSnapshot,
  };
};

const budgetStore = createBudgetStore();

let budgetState = {
  target: 0,
  items: [],
};

const budgetFilters = {
  category: '',
  paid: '',
};

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return currencyFormatter.format(numeric);
};

const formatBudgetDate = (value) => {
  const normalized = normalizeDueDate(value);

  if (!normalized) {
    return '—';
  }

  const [year, month, day] = normalized.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(date);
};

const renderBudgetSummary = () => {
  const totalEstimated = budgetState.items.reduce(
    (sum, item) => sum + (Number.isFinite(item.est) ? item.est : 0),
    0,
  );
  const totalActual = budgetState.items.reduce(
    (sum, item) => sum + (Number.isFinite(item.act) ? item.act : 0),
    0,
  );
  const totalPaid = budgetState.items.reduce(
    (sum, item) => sum + (item.paid ? (Number.isFinite(item.act) ? item.act : 0) : 0),
    0,
  );

  const diff = totalActual - totalEstimated;
  const paidPercent = totalActual > 0 ? Math.round((totalPaid / totalActual) * 100) : 0;

  if (budgetTargetValue) {
    budgetTargetValue.textContent = formatCurrency(budgetState.target);
  }

  if (budgetEstimatedValue) {
    budgetEstimatedValue.textContent = formatCurrency(totalEstimated);
  }

  if (budgetActualValue) {
    budgetActualValue.textContent = formatCurrency(totalActual);
  }

  if (budgetPaidValue) {
    budgetPaidValue.textContent = formatCurrency(totalPaid);
  }

  if (budgetPaidPercentValue) {
    budgetPaidPercentValue.textContent = `${Math.max(0, Math.min(100, paidPercent))}%`;
  }

  if (budgetDiffValue) {
    budgetDiffValue.textContent = formatCurrency(diff);
    budgetDiffValue.classList.toggle('budget-diff--positive', diff <= 0);
    budgetDiffValue.classList.toggle('budget-diff--negative', diff > 0);
  }
};

const updateBudgetCategoryFilter = () => {
  if (!budgetCategoryFilter) {
    return;
  }

  const currentValue = budgetCategoryFilter.value;

  Array.from(budgetCategoryFilter.options)
    .slice(1)
    .forEach((option) => option.remove());

  const categories = Array.from(
    new Set(budgetState.items.map((item) => item.category).filter((category) => Boolean(category))),
  ).sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }));

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    budgetCategoryFilter.append(option);
  });

  if (currentValue && !categories.includes(currentValue)) {
    budgetCategoryFilter.value = '';
    budgetFilters.category = '';
  } else if (currentValue) {
    budgetCategoryFilter.value = currentValue;
  }
};

const applyBudgetFilters = (items) =>
  items.filter((item) => {
    if (budgetFilters.category && item.category !== budgetFilters.category) {
      return false;
    }

    if (budgetFilters.paid === 'paid' && !item.paid) {
      return false;
    }

    if (budgetFilters.paid === 'pending' && item.paid) {
      return false;
    }

    return true;
  });

const createBudgetRow = (item) => {
  const row = document.createElement('tr');
  row.dataset.id = item.id;

  const titleCell = document.createElement('td');
  titleCell.className = 'budget-table__cell budget-table__cell--title';
  titleCell.textContent = item.title;

  const categoryCell = document.createElement('td');
  categoryCell.className = 'budget-table__cell';
  categoryCell.textContent = item.category || 'General';

  const estimatedCell = document.createElement('td');
  estimatedCell.className = 'budget-table__cell budget-table__cell--number';
  estimatedCell.textContent = formatCurrency(item.est);

  const actualCell = document.createElement('td');
  actualCell.className = 'budget-table__cell budget-table__cell--number';
  const actualInput = document.createElement('input');
  actualInput.type = 'number';
  actualInput.className = 'budget-row__actual';
  actualInput.min = '0';
  actualInput.step = '0.01';
  actualInput.value = item.act ? String(item.act) : '';
  actualInput.setAttribute('aria-label', `Importe real de ${item.title}`);
  actualCell.append(actualInput);

  const diffCell = document.createElement('td');
  diffCell.className = 'budget-table__cell budget-table__cell--number budget-diff';
  const diff = (Number.isFinite(item.act) ? item.act : 0) - (Number.isFinite(item.est) ? item.est : 0);
  diffCell.textContent = formatCurrency(diff);
  diffCell.classList.toggle('budget-diff--positive', diff <= 0);
  diffCell.classList.toggle('budget-diff--negative', diff > 0);

  const paidCell = document.createElement('td');
  paidCell.className = 'budget-table__cell budget-table__cell--paid';
  const paidLabel = document.createElement('label');
  paidLabel.className = 'budget-row__paid-label';
  const paidCheckbox = document.createElement('input');
  paidCheckbox.type = 'checkbox';
  paidCheckbox.className = 'budget-row__paid';
  paidCheckbox.checked = Boolean(item.paid);
  paidCheckbox.setAttribute('aria-label', `Marcar ${item.title} como pagado`);
  const paidText = document.createElement('span');
  paidText.textContent = 'Pagado';
  paidLabel.append(paidCheckbox, paidText);
  paidCell.append(paidLabel);

  const dueCell = document.createElement('td');
  dueCell.className = 'budget-table__cell';
  dueCell.textContent = formatBudgetDate(item.dueDate);
  if (item.dueDate) {
    dueCell.title = item.dueDate;
  }

  const providerCell = document.createElement('td');
  providerCell.className = 'budget-table__cell';
  providerCell.textContent = item.provider || '—';

  const actionsCell = document.createElement('td');
  actionsCell.className = 'budget-table__cell budget-table__cell--actions';
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'budget-row__delete';
  deleteButton.textContent = 'Eliminar';
  deleteButton.setAttribute('aria-label', `Eliminar gasto: ${item.title}`);
  actionsCell.append(deleteButton);

  row.append(
    titleCell,
    categoryCell,
    estimatedCell,
    actualCell,
    diffCell,
    paidCell,
    dueCell,
    providerCell,
    actionsCell,
  );

  return row;
};

const renderBudgetTable = () => {
  if (!budgetTableBody) {
    return;
  }

  budgetTableBody.innerHTML = '';

  const filtered = applyBudgetFilters(budgetState.items);

  if (!filtered.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'budget-table__empty';

    const cell = document.createElement('td');
    cell.colSpan = 9;
    cell.textContent = budgetState.items.length
      ? 'No hay elementos que coincidan con los filtros.'
      : 'Agrega tu primer gasto para seguir el presupuesto.';

    emptyRow.append(cell);
    budgetTableBody.append(emptyRow);
    return;
  }

  filtered.forEach((item) => {
    budgetTableBody.append(createBudgetRow(item));
  });
};

const handleBudgetTargetSubmit = (event) => {
  event.preventDefault();

  const value = budgetTargetInput ? Number.parseFloat(budgetTargetInput.value) || 0 : 0;
  const submission = budgetStore.setTarget(value);

  if (submission && typeof submission.catch === 'function') {
    submission.catch((error) => {
      console.error('No se pudo actualizar el objetivo de presupuesto.', error);
      alert('No se pudo actualizar el objetivo. Inténtalo nuevamente.');
    });
  }
};

const handleBudgetItemSubmit = (event) => {
  event.preventDefault();

  if (!budgetItemForm) {
    return;
  }

  const payload = {
    title: budgetTitleInput ? budgetTitleInput.value : '',
    category: budgetCategoryInput ? budgetCategoryInput.value : '',
    est: budgetEstimateInput ? budgetEstimateInput.value : 0,
    act: budgetActualInput ? budgetActualInput.value : 0,
    provider: budgetProviderInput ? budgetProviderInput.value : '',
    dueDate: budgetDateInput ? budgetDateInput.value : '',
  };

  const submission = budgetStore.addItem(payload);

  budgetItemForm.reset();

  if (budgetTitleInput) {
    budgetTitleInput.focus();
  }

  if (submission && typeof submission.catch === 'function') {
    submission.catch((error) => {
      console.error('No se pudo guardar el gasto.', error);
      alert('No se pudo guardar el gasto. Inténtalo nuevamente.');
    });
  }
};

const handleBudgetCategoryFilterChange = (event) => {
  budgetFilters.category = event.target.value;
  renderBudgetTable();
};

const handleBudgetPaidFilterChange = (event) => {
  budgetFilters.paid = event.target.value;
  renderBudgetTable();
};

const handleBudgetTableChange = (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;

  if (!target) {
    return;
  }

  const row = target.closest('tr');

  if (!row) {
    return;
  }

  const itemId = row.dataset.id;

  if (!itemId) {
    return;
  }

  if (target.matches('.budget-row__actual')) {
    const update = budgetStore.updateItem(itemId, { act: target.value });

    if (update && typeof update.catch === 'function') {
      update.catch((error) => {
        console.error('No se pudo actualizar el importe real.', error);
        alert('No se pudo actualizar el importe real. Inténtalo nuevamente.');
      });
    }

    return;
  }

  if (target.matches('.budget-row__paid')) {
    const update = budgetStore.updateItem(itemId, { paid: target.checked });

    if (update && typeof update.catch === 'function') {
      update.catch((error) => {
        console.error('No se pudo actualizar el estado de pago.', error);
        alert('No se pudo actualizar el estado de pago. Inténtalo nuevamente.');
      });
    }
  }
};

const handleBudgetTableClick = (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;

  if (!target) {
    return;
  }

  const deleteButton = target.closest('.budget-row__delete');

  if (!deleteButton) {
    return;
  }

  const row = deleteButton.closest('tr');

  if (!row) {
    return;
  }

  const itemId = row.dataset.id;

  if (!itemId) {
    return;
  }

  const confirmed = window.confirm('¿Quieres eliminar este gasto?');

  if (!confirmed) {
    return;
  }

  const removal = budgetStore.deleteItem(itemId);

  if (removal && typeof removal.catch === 'function') {
    removal.catch((error) => {
      console.error('No se pudo eliminar el gasto.', error);
      alert('No se pudo eliminar el gasto. Inténtalo nuevamente.');
    });
  }
};

const initializeBudgetSection = () => {
  if (!budgetTargetForm || !budgetItemForm || !budgetTableBody) {
    return;
  }

  budgetStore.subscribe((snapshot) => {
    budgetState = {
      target: Number.isFinite(snapshot.target) ? snapshot.target : 0,
      items: snapshot.items,
    };

    renderBudgetSummary();
    updateBudgetCategoryFilter();
    renderBudgetTable();
  });

  budgetStore.init();

  budgetTargetForm.addEventListener('submit', handleBudgetTargetSubmit);
  budgetItemForm.addEventListener('submit', handleBudgetItemSubmit);

  if (budgetCategoryFilter) {
    budgetCategoryFilter.addEventListener('change', handleBudgetCategoryFilterChange);
  }

  if (budgetPaidFilter) {
    budgetPaidFilter.addEventListener('change', handleBudgetPaidFilterChange);
  }

  budgetTableBody.addEventListener('change', handleBudgetTableChange);
  budgetTableBody.addEventListener('click', handleBudgetTableClick);
};

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
initializeGuestSection();
initializeIdeasSection();
initializeVenuesSection();
initializeBudgetSection();
selectTab('checklist');

window.addEventListener('beforeunload', () => {
  try {
    stopVenuesSubscription();
  } catch (error) {
    console.warn('No se pudo detener la suscripción de lugares.', error);
  }

  venuesStore.destroy();
  guestsStore.destroy();
  ideasStore.destroy();
  budgetStore.destroy();
});


