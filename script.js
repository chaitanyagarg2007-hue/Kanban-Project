const STORAGE_KEY = "taskflow-kanban-tasks";

const newTaskButton = document.querySelector("#new-task-btn");
const taskDialog = document.querySelector("#task-dialog");
const taskForm = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const descriptionInput = document.querySelector("#task-description");
const statusInput = document.querySelector("#task-status");
const closeDialogButton = document.querySelector("#close-dialog-btn");
const cancelButton = document.querySelector("#cancel-btn");
const formError = document.querySelector("#form-error");

const columns = {
  todo: {
    list: document.querySelector("#todo-list"),
    count: document.querySelector("#todo-count"),
    emptyMessage: "Nothing here yet. Add your first task."
  },
  inProgress: {
    list: document.querySelector("#inProgress-list"),
    count: document.querySelector("#inProgress-count"),
    emptyMessage: "No tasks in progress. You're all caught up."
  },
  completed: {
    list: document.querySelector("#completed-list"),
    count: document.querySelector("#completed-count"),
    emptyMessage: "Completed tasks will show up here."
  }
};

// Each task is a JavaScript object with its own ID and current column.
let tasks = loadTasks();
let draggedTaskId = null;

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];
    return Array.isArray(parsedTasks) ? parsedTasks : [];
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Could not save tasks:", error);
    alert("Your browser couldn't save the tasks. Check your storage settings.");
  }
}

function renderTasks() {
  // Clear old cards so the screen is rebuilt from the latest task data.
  Object.values(columns).forEach(({ list }) => {
    list.replaceChildren();
  });

  // Put each task into the list matching its current status.
  tasks.forEach((task) => {
    const column = columns[task.status];
    if (!column) return;

    const card = document.createElement("article");
    card.className = "task-card";
    card.draggable = true;
    card.dataset.taskId = task.id;

    const title = document.createElement("h3");
    title.textContent = task.title;

    const description = document.createElement("p");
    description.textContent = task.description || "No description added.";

    const footer = document.createElement("div");
    footer.className = "task-card-footer";

    const label = document.createElement("span");
    label.className = "task-label";
    label.textContent = "TASK";

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete task: ${task.title}`);
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    footer.append(label, deleteButton);
    card.append(title, description, footer);

    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);

    column.list.append(card);
  });

  // Update each count using the task data, not by counting HTML elements.
  Object.entries(columns).forEach(([status, column]) => {
    const count = tasks.filter((task) => task.status === status).length;
    column.count.textContent = count;

    if (count === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = column.emptyMessage;
      column.list.append(emptyState);
    }
  });
}

function openTaskDialog(status = "todo") {
  taskForm.reset();
  formError.textContent = "";
  statusInput.value = status;
  taskDialog.showModal();
  titleInput.focus();
}

function closeTaskDialog() {
  taskDialog.close();
  taskForm.reset();
  formError.textContent = "";
}

function addTask(title, description, status) {
  const task = {
    id: crypto.randomUUID(),
    title,
    description,
    status,
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  saveTasks();
  renderTasks();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
}

function handleDragStart(event) {
  draggedTaskId = event.currentTarget.dataset.taskId;
  event.currentTarget.classList.add("dragging");

  event.dataTransfer.setData("text/plain", draggedTaskId);
  event.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  draggedTaskId = null;

  document.querySelectorAll(".column").forEach((column) => {
    column.classList.remove("drag-over");
  });
}

// Set up each column as a valid drop target.
document.querySelectorAll(".column").forEach((columnElement) => {
  columnElement.addEventListener("dragover", (event) => {
    event.preventDefault(); // Required to allow dropping into this column.
    event.dataTransfer.dropEffect = "move";
    columnElement.classList.add("drag-over");
  });

  columnElement.addEventListener("dragleave", (event) => {
    // Don't remove the highlight when moving between children inside the column.
    if (!columnElement.contains(event.relatedTarget)) {
      columnElement.classList.remove("drag-over");
    }
  });

  columnElement.addEventListener("drop", (event) => {
    event.preventDefault();
    columnElement.classList.remove("drag-over");

    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    const newStatus = columnElement.dataset.status;

    tasks = tasks.map((task) =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );

    saveTasks();
    renderTasks();
  });
});

newTaskButton.addEventListener("click", () => openTaskDialog("todo"));
closeDialogButton.addEventListener("click", closeTaskDialog);
cancelButton.addEventListener("click", closeTaskDialog);

document.querySelectorAll("[data-add-status]").forEach((button) => {
  button.addEventListener("click", () => {
    openTaskDialog(button.dataset.addStatus);
  });
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const status = statusInput.value;

  if (!title) {
    formError.textContent = "Please enter a task title.";
    titleInput.focus();
    return;
  }

  if (!Object.hasOwn(columns, status)) {
    formError.textContent = "Please choose a valid column.";
    return;
  }

  addTask(title, description, status);
  closeTaskDialog();
});

// Close the modal if the user clicks the backdrop outside the form.
// taskDialog.addEventListener("click", (event) => {
//   if (event.target === taskDialog) {
//     closeTaskDialog();
//   }
// });

// Draw saved tasks as soon as the page loads.
renderTasks();

const themeToggle = document.querySelector("#theme-toggle");

// Restore the saved theme, or use the computer's theme.
const savedTheme = localStorage.getItem("kanban-theme");

const prefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;

let isDark = savedTheme
  ? savedTheme === "dark"
  : prefersDark;

function applyTheme() {
  document.body.classList.toggle("dark-theme", isDark);

  themeToggle.textContent = isDark
    ? "☀ Light mode"
    : "☾ Dark mode";
}

themeToggle.addEventListener("click", () => {
  isDark = !isDark;

  localStorage.setItem(
    "kanban-theme",
    isDark ? "dark" : "light"
  );

  applyTheme();
});

applyTheme();
