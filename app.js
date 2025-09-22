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
const ideaTitleInput = document.getElementById('idea-title');
const ideaUrlInput = document.getElementById('idea-url');
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

const handleIdeaFormSubmit = (event) => {
  event.preventDefault();

  if (!ideaForm) {
    return;
  }

  const payload = {
    title: ideaTitleInput ? ideaTitleInput.value : '',
    url: ideaUrlInput ? ideaUrlInput.value : '',
    category: ideaCategoryInput ? ideaCategoryInput.value : '',
    note: ideaNoteInput ? ideaNoteInput.value : '',
  };

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
initializeBudgetSection();
selectTab('checklist');

window.addEventListener('beforeunload', () => {
  guestsStore.destroy();
  ideasStore.destroy();
  budgetStore.destroy();
});


