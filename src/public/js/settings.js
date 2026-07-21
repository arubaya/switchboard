const alertBox = document.getElementById("alert");
const appConfigForm = document.getElementById("app-config-form");
const addUserForm = document.getElementById("add-user-form");
const usersTable = document.getElementById("users-table");
const usersTableWrap = document.getElementById("users-table-wrap");
const usersLoading = document.getElementById("users-loading");
const editUserModal = document.getElementById("edit-user-modal");
const editUserForm = document.getElementById("edit-user-form");
const editUserClose = document.getElementById("edit-user-close");
const editUserCancel = document.getElementById("edit-user-cancel");

const isAppPage = Boolean(appConfigForm);
const isUsersPage = Boolean(addUserForm);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showAlert(message, type = "error") {
  if (!alertBox) {
    return;
  }

  alertBox.textContent = message;
  alertBox.className =
    type === "success"
      ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      : type === "info"
        ? "rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
        : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700";
  alertBox.classList.remove("hidden");
}

function clearAlert() {
  if (!alertBox) {
    return;
  }

  alertBox.textContent = "";
  alertBox.classList.add("hidden");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function waitForServer(origin, maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${origin}/health`, { cache: "no-store" });

      if (response.ok) {
        return true;
      }
    } catch {
      // server still restarting
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

function resolveOrigin(config) {
  const hostname =
    config.host === "0.0.0.0" || config.host === "::"
      ? window.location.hostname
      : config.host;

  return `${window.location.protocol}//${hostname}:${config.port}`;
}

async function loadAppConfig() {
  const data = await api("/api/settings/app");
  appConfigForm.elements.host.value = data.config.host;
  appConfigForm.elements.port.value = data.config.port;
}

if (isAppPage) {
  appConfigForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

    const submitButton = appConfigForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(appConfigForm);

    try {
      const data = await api("/api/settings/app", {
        method: "PUT",
        body: JSON.stringify({
          host: String(formData.get("host")),
          port: Number(formData.get("port")),
        }),
      });

      const targetOrigin = resolveOrigin(data.config);
      showAlert("Saved. Restarting Switchboard...", "info");

      const ready = await waitForServer(targetOrigin);

      if (ready) {
        window.location.href = `${targetOrigin}/settings/app`;
        return;
      }

      showAlert(
        `Server may be running at ${targetOrigin}. Open that URL manually.`,
        "info",
      );
    } catch (error) {
      showAlert(error.message);
      submitButton.disabled = false;
    }
  });

  loadAppConfig().catch((error) => showAlert(error.message));
}

function openEditUserModal(username) {
  editUserForm.elements.originalUsername.value = username;
  editUserForm.elements.username.value = username;
  editUserForm.elements.password.value = "";

  editUserModal.classList.remove("hidden");
  editUserModal.classList.add("flex");
}

function closeEditUserModal() {
  editUserModal.classList.add("hidden");
  editUserModal.classList.remove("flex");
  editUserForm.reset();
}

function renderUsers(users) {
  usersTable.innerHTML = "";

  if (!users.length) {
    usersTableWrap.classList.add("hidden");
    return;
  }

  usersTableWrap.classList.remove("hidden");

  for (const user of users) {
    const row = document.createElement("tr");
    row.className = "hover:bg-slate-50";

    row.innerHTML = `
      <td class="px-5 py-3 font-medium sm:px-6">${escapeHtml(user.username)}</td>
      <td class="px-5 py-3 sm:px-6">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            data-action="edit"
            data-username="${escapeHtml(user.username)}"
            class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            Edit
          </button>
          <button
            type="button"
            data-action="delete"
            data-username="${escapeHtml(user.username)}"
            class="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    `;

    usersTable.appendChild(row);
  }
}

async function loadUsers() {
  usersLoading.classList.remove("hidden");
  usersTableWrap.classList.add("hidden");
  clearAlert();

  try {
    const data = await api("/api/settings/users");
    renderUsers(data.users);
  } catch (error) {
    showAlert(error.message);
  } finally {
    usersLoading.classList.add("hidden");
  }
}

if (isUsersPage) {
  addUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

    const formData = new FormData(addUserForm);
    const submitButton = addUserForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      await api("/api/settings/users", {
        method: "POST",
        body: JSON.stringify({
          username: String(formData.get("username")),
          password: String(formData.get("password")),
        }),
      });

      addUserForm.reset();
      showAlert("User added successfully.", "success");
      await loadUsers();
    } catch (error) {
      showAlert(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  editUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

    const formData = new FormData(editUserForm);
    const originalUsername = String(formData.get("originalUsername"));
    const username = String(formData.get("username"));
    const password = String(formData.get("password"));
    const payload = {};

    if (username !== originalUsername) {
      payload.username = username;
    }

    if (password) {
      payload.password = password;
    }

    const submitButton = editUserForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      await api(
        `/api/settings/users/${encodeURIComponent(originalUsername)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      closeEditUserModal();
      showAlert("User updated successfully.", "success");
      await loadUsers();
    } catch (error) {
      showAlert(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  usersTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const username = button.dataset.username;
    const action = button.dataset.action;

    try {
      if (action === "edit") {
        openEditUserModal(username);
        return;
      }

      if (action === "delete") {
        if (!confirm(`Delete user "${username}"?`)) {
          return;
        }

        await api(
          `/api/settings/users/${encodeURIComponent(username)}`,
          { method: "DELETE" },
        );
        showAlert("User deleted.", "success");
        await loadUsers();
      }
    } catch (error) {
      showAlert(error.message);
    }
  });

  editUserClose.addEventListener("click", closeEditUserModal);
  editUserCancel.addEventListener("click", closeEditUserModal);

  editUserModal.addEventListener("click", (event) => {
    if (event.target === editUserModal) {
      closeEditUserModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !editUserModal.classList.contains("hidden")) {
      closeEditUserModal();
    }
  });

  loadUsers();
}
