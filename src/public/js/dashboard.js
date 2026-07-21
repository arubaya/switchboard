const routesTable = document.getElementById("routes-table");
const routesEmpty = document.getElementById("routes-empty");
const routeForm = document.getElementById("route-form");
const formError = document.getElementById("form-error");
const refreshButton = document.getElementById("refresh-routes");

function showError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function clearError() {
  formError.textContent = "";
  formError.classList.add("hidden");
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

function renderRoutes(routes) {
  routesTable.innerHTML = "";

  if (!routes.length) {
    routesEmpty.classList.remove("hidden");
    return;
  }

  routesEmpty.classList.add("hidden");

  for (const route of routes) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="px-3 py-3 font-medium">${route.id}</td>
      <td class="px-3 py-3 font-mono text-xs">${route.path}</td>
      <td class="px-3 py-3 font-mono text-xs">${route.target}</td>
      <td class="px-3 py-3">${route.enabled ? "Yes" : "No"}</td>
      <td class="px-3 py-3">${route.stripPrefix ? "Yes" : "No"}</td>
      <td class="px-3 py-3">
        <div class="flex gap-2">
          <button
            type="button"
            data-action="toggle"
            data-id="${route.id}"
            class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            ${route.enabled ? "Disable" : "Enable"}
          </button>
          <button
            type="button"
            data-action="delete"
            data-id="${route.id}"
            class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
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
  const data = await api("/api/routes");
  renderRoutes(data.routes);
}

routeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const formData = new FormData(routeForm);

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
    await loadRoutes();
  } catch (error) {
    showError(error.message);
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
    }

    await loadRoutes();
  } catch (error) {
    showError(error.message);
  }
});

refreshButton.addEventListener("click", () => {
  loadRoutes().catch((error) => showError(error.message));
});

loadRoutes().catch((error) => showError(error.message));
