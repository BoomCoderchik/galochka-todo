"use strict";

const storageKey = "galochka-todo.tasks.v1";
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const formError = document.querySelector("#form-error");
const storageError = document.querySelector("#storage-error");
const list = document.querySelector("#tasks");
const template = document.querySelector("#task-template");
const filters = [...document.querySelectorAll("[data-filter]")];
const summary = document.querySelector("#summary");
const progress = document.querySelector("#progress");
const progressCount = document.querySelector("#progress-count");
const empty = document.querySelector("#empty");
const emptyTitle = document.querySelector("#empty-title");
const emptyCopy = document.querySelector("#empty-copy");
const announcement = document.querySelector("#announcement");

let filter = "all";
let tasks = [];

function showStorageError(message) {
  storageError.textContent = message;
  storageError.hidden = !message;
}

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(stored) || !stored.every(task =>
      task && typeof task.id === "string" && typeof task.title === "string" &&
      typeof task.done === "boolean"
    )) {
      throw new Error("Invalid task data");
    }

    tasks = stored;
    showStorageError("");
  } catch {
    showStorageError("Не удалось загрузить список из хранилища браузера.");
  }
}

function saveTasks(nextTasks) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextTasks));
  } catch {
    showStorageError("Изменение не сохранилось. Проверьте настройки хранилища браузера и попробуйте ещё раз.");
    return false;
  }

  tasks = nextTasks;
  showStorageError("");
  return true;
}

function createRow(task) {
  const row = template.content.firstElementChild.cloneNode(true);
  const checkbox = row.querySelector("input");
  const deleteButton = row.querySelector(".delete");

  row.dataset.id = task.id;
  row.querySelector(".task-title").textContent = task.title;
  checkbox.checked = task.done;
  deleteButton.setAttribute("aria-label", "Удалить задачу «" + task.title + "»");

  checkbox.addEventListener("change", () => {
    const done = checkbox.checked;
    if (!saveTasks(tasks.map(item => item.id === task.id ? { ...item, done } : item))) {
      checkbox.checked = task.done;
      return;
    }

    render();
    announcement.textContent = done ? "Задача выполнена." : "Задача снова в работе.";
  });

  deleteButton.addEventListener("click", () => {
    if (!saveTasks(tasks.filter(item => item.id !== task.id))) return;
    render();
    announcement.textContent = "Задача удалена.";
  });

  return row;
}

function render() {
  const active = document.activeElement;
  const focusedRow = active.closest(".task");
  const previousRows = [...list.children];
  const focusedIndex = previousRows.indexOf(focusedRow);
  const completed = tasks.filter(task => task.done).length;
  const visible = tasks.filter(task => filter === "all" || task.done === (filter === "done"));
  const rows = visible.map(createRow);

  list.replaceChildren(...rows);
  list.hidden = rows.length === 0;
  summary.hidden = tasks.length === 0;
  progress.max = tasks.length || 1;
  progress.value = completed;
  progressCount.textContent = completed + " из " + tasks.length;

  for (const button of filters) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  }

  empty.hidden = rows.length > 0;
  if (!tasks.length) {
    emptyTitle.textContent = "Чистый лист";
    emptyCopy.textContent = "Добавьте первую задачу в поле выше.";
  } else if (filter === "done") {
    emptyTitle.textContent = "Пока ничего не вычеркнуто";
    emptyCopy.textContent = "Отметьте выполненную задачу, и она появится здесь.";
  } else {
    emptyTitle.textContent = "Все задачи выполнены";
    emptyCopy.textContent = "Можно выдохнуть.";
  }

  if (focusedIndex >= 0) {
    const nextRow = rows.find(row => row.dataset.id === focusedRow.dataset.id) ??
      rows[Math.min(focusedIndex, rows.length - 1)];
    const selector = active.matches("input") ? "input" : "button";
    const nextFocus = nextRow?.querySelector(selector) ??
      (filter === "all" ? titleInput : filters.find(button => button.dataset.filter === filter));
    nextFocus.focus({ preventScroll: true });
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();

  if (!title) {
    formError.textContent = "Введите название задачи.";
    formError.hidden = false;
    titleInput.setAttribute("aria-invalid", "true");
    titleInput.focus();
    return;
  }

  if (!saveTasks([{ id: crypto.randomUUID(), title, done: false }, ...tasks])) return;
  form.reset();
  if (filter === "done") filter = "all";
  render();
  titleInput.focus();
  announcement.textContent = "Задача добавлена.";
});

titleInput.addEventListener("input", () => {
  formError.hidden = true;
  titleInput.removeAttribute("aria-invalid");
});

for (const button of filters) {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    render();
  });
}

window.addEventListener("storage", event => {
  if (event.key === storageKey || event.key === null) {
    loadTasks();
    render();
  }
});

const now = new Date();
const date = document.querySelector("#date");
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric", month: "long", weekday: "short",
});
const localDate = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric", month: "2-digit", day: "2-digit",
});
date.dateTime = localDate.format(now);
date.textContent = dateFormat.format(now);

loadTasks();
render();
