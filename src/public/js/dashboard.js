const routesTable = document.getElementById("routes-table");
const routesTableWrap = document.getElementById("routes-table-wrap");
const routesEmpty = document.getElementById("routes-empty");
const routesLoading = document.getElementById("routes-loading");
const routeForm = document.getElementById("route-form");
const refreshButton = document.getElementById("refresh-routes");
const alertBox = document.getElementById("alert");
const routeCount = document.getElementById("route-count");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className =
    type === "success"
      ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700";
  alertBox.classList.remove("hidden");
}

function clearAlert() {
  alertBox.textContent = "";
  alertBox.classList.add("hidden");
}

function setLoading(isLoading) {
  routesLoading.classList.toggle("hidden", !isLoading);
}

function updateRouteCount(count) {
  routeCount.textContent = `${count} route${count === 1 ? "" : "s"}`;
  routeCount.classList.remove("hidden");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
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

function statusBadge(enabled) {
  return enabled
    ? '<span class="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Enabled</span>'
    : '<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Disabled</span>';
}

function renderRoutes(routes) {
  routesTable.innerHTML = "";
  updateRouteCount(routes.length);

  if (!routes.length) {
    routesTableWrap.classList.add("hidden");
    routesEmpty.classList.remove("hidden");
    return;
  }

  routesEmpty.classList.add("hidden");
  routesTableWrap.classList.remove("hidden");

  for (const route of routes) {
    const row = document.createElement("tr");
    row.className = "hover:bg-slate-50";

    row.innerHTML = `
      <td class="px-5 py-3 font-medium sm:px-6">${escapeHtml(route.id)}</td>
      <td class="px-5 py-3 font-mono text-xs text-slate-700 sm:px-6">${escapeHtml(route.path)}</td>
      <td class="px-5 py-3 font-mono text-xs text-slate-700 sm:px-6">${escapeHtml(route.target)}</td>
      <td class="px-5 py-3 sm:px-6">${statusBadge(route.enabled)}</td>
      <td class="px-5 py-3 text-slate-600 sm:px-6">${route.stripPrefix ? "Yes" : "No"}</td>
      <td class="px-5 py-3 sm:px-6">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            data-action="toggle"
            data-id="${escapeHtml(route.id)}"
            class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            ${route.enabled ? "Disable" : "Enable"}
          </button>
          <button
            type="button"
            data-action="delete"
            data-id="${escapeHtml(route.id)}"
            class="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    `;

    routesTable.appendChild(row);
  }
}

async function loadRoutes() {
  setLoading(true);
  clearAlert();

  try {
    const data = await api("/api/routes");
    renderRoutes(data.routes);
  } catch (error) {
    showAlert(error.message);
  } finally {
    setLoading(false);
  }
}

routeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert();

  const formData = new FormData(routeForm);
  const submitButton = routeForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    await api("/api/routes", {
      method: "POST",
      body: JSON.stringify({
        id: String(formData.get("id")),
        path: String(formData.get("path")),
        target: String(formData.get("target")),
        enabled: formData.has("enabled"),
        stripPrefix: formData.has("stripPrefix"),
      }),
    });

    routeForm.reset();
    showAlert("Route added successfully.", "success");
    await loadRoutes();
  } catch (error) {
    showAlert(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

routesTable.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  try {
    if (action === "delete") {
      if (!confirm(`Delete route "${id}"?`)) {
        return;
      }

      await api(`/api/routes/${id}`, { method: "DELETE" });
      showAlert("Route deleted.", "success");
    }

    if (action === "toggle") {
      const data = await api("/api/routes");
      const route = data.routes.find((item) => item.id === id);

      if (!route) {
        return;
      }

      await api(`/api/routes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !route.enabled }),
      });

      showAlert(`Route ${route.enabled ? "disabled" : "enabled"}.`, "success");
    }

    await loadRoutes();
  } catch (error) {
    showAlert(error.message);
  }
});

refreshButton.addEventListener("click", () => {
  loadRoutes();
});

loadRoutes();
