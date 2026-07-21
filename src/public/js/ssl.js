const alertBox = document.getElementById("alert");
const sslForm = document.getElementById("ssl-form");
const providerCustom = document.getElementById("provider-custom");
const providerLetsencrypt = document.getElementById("provider-letsencrypt");
const statusLoading = document.getElementById("status-loading");
const statusGrid = document.getElementById("status-grid");
const reloadButton = document.getElementById("reload-ssl");
const requestCertButton = document.getElementById("request-cert");
const renewCertButton = document.getElementById("renew-cert");

function showAlert(message, type = "error") {
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

function badge(label, tone) {
  const tones = {
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-600",
  };

  return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}">${label}</span>`;
}

function renderStatus(status) {
  const daysTone =
    status.daysRemaining === null
      ? "neutral"
      : status.daysRemaining <= 14
        ? "warn"
        : "ok";

  const items = [
    ["HTTPS enabled", status.httpsEnabled ? badge("Yes", "ok") : badge("No", "neutral")],
    ["Provider", badge(status.provider, "neutral")],
    [
      "Certificate loaded",
      status.certificateLoaded ? badge("Yes", "ok") : badge("No", "bad"),
    ],
    [
      "Certificate exists",
      status.certificateExists ? badge("Yes", "ok") : badge("No", "bad"),
    ],
    [
      "Private key exists",
      status.privateKeyExists ? badge("Yes", "ok") : badge("No", "bad"),
    ],
    ["Issuer", status.issuer ?? "—"],
    ["Subject", status.subject ?? "—"],
    ["Valid from", status.validFrom ?? "—"],
    ["Valid until", status.validUntil ?? "—"],
    [
      "Days remaining",
      status.daysRemaining === null ? "—" : badge(String(status.daysRemaining), daysTone),
    ],
    [
      "Domains",
      status.domains.length ? status.domains.join(", ") : "—",
    ],
  ];

  statusGrid.innerHTML = items
    .map(
      ([label, value]) => `
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div class="text-xs font-medium uppercase tracking-wide text-slate-500">${label}</div>
          <div class="mt-2 text-sm text-slate-800">${value}</div>
        </div>
      `,
    )
    .join("");

  if (status.errors.length) {
    statusGrid.innerHTML += `
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:col-span-2 lg:col-span-3">
        <div class="text-xs font-medium uppercase tracking-wide text-red-600">Validation</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
          ${status.errors.map((error) => `<li>${error}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  statusLoading.classList.add("hidden");
  statusGrid.classList.remove("hidden");
}

function toggleProviderSections(provider) {
  providerCustom.classList.toggle("hidden", provider !== "custom");
  providerLetsencrypt.classList.toggle("hidden", provider !== "letsencrypt");
}

function fillForm(config) {
  sslForm.elements.enabled.checked = config.enabled;
  sslForm.elements.redirectHttpToHttps.checked = config.redirectHttpToHttps;
  sslForm.elements.httpPort.value = config.httpPort;
  sslForm.elements.httpsPort.value = config.httpsPort;
  sslForm.elements.provider.value = config.provider;
  sslForm.elements.customCertificatePath.value = config.custom.certificatePath;
  sslForm.elements.customPrivateKeyPath.value = config.custom.privateKeyPath;
  sslForm.elements.letsencryptEmail.value = config.letsencrypt.email;
  sslForm.elements.letsencryptDomains.value = config.letsencrypt.domains.join("\n");
  sslForm.elements.letsencryptStaging.checked = config.letsencrypt.staging;
  sslForm.elements.letsencryptAutoRenew.checked = config.letsencrypt.autoRenew;
  toggleProviderSections(config.provider);
}

function readFormConfig() {
  const formData = new FormData(sslForm);

  return {
    enabled: formData.has("enabled"),
    redirectHttpToHttps: formData.has("redirectHttpToHttps"),
    httpPort: Number(formData.get("httpPort")),
    httpsPort: Number(formData.get("httpsPort")),
    provider: String(formData.get("provider")),
    custom: {
      certificatePath: String(formData.get("customCertificatePath") ?? ""),
      privateKeyPath: String(formData.get("customPrivateKeyPath") ?? ""),
    },
    letsencrypt: {
      email: String(formData.get("letsencryptEmail") ?? ""),
      domains: String(formData.get("letsencryptDomains") ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      staging: formData.has("letsencryptStaging"),
      autoRenew: formData.has("letsencryptAutoRenew"),
    },
  };
}

async function waitForServer(maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch("/health", { cache: "no-store" });

      if (response.ok) {
        return true;
      }
    } catch {
      // server restarting
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

async function handleRestartResponse(message) {
  showAlert(message, "info");
  const ready = await waitForServer();

  if (ready) {
    window.location.reload();
    return;
  }

  showAlert("Server restart timed out. Refresh manually.", "error");
}

async function loadStatus() {
  statusLoading.classList.remove("hidden");
  statusGrid.classList.add("hidden");

  const data = await api("/api/ssl/status");
  renderStatus(data.status);
}

async function loadConfig() {
  const data = await api("/api/ssl");
  fillForm(data.config);
}

sslForm.elements.provider.addEventListener("change", (event) => {
  toggleProviderSections(event.target.value);
});

sslForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert();

  const submitButton = sslForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await api("/api/ssl", {
      method: "PATCH",
      body: JSON.stringify(readFormConfig()),
    });

    await handleRestartResponse(response.message);
  } catch (error) {
    showAlert(error.message);
    submitButton.disabled = false;
  }
});

reloadButton.addEventListener("click", async () => {
  clearAlert();

  try {
    const response = await api("/api/ssl/reload", { method: "POST", body: "{}" });
    await handleRestartResponse(response.message);
  } catch (error) {
    showAlert(error.message);
  }
});

requestCertButton.addEventListener("click", async () => {
  clearAlert();

  try {
    await api("/api/ssl", {
      method: "PATCH",
      body: JSON.stringify(readFormConfig()),
    });

    const response = await api("/api/ssl/request", { method: "POST", body: "{}" });
    await handleRestartResponse(response.message);
  } catch (error) {
    showAlert(error.message);
  }
});

renewCertButton.addEventListener("click", async () => {
  clearAlert();

  try {
    const response = await api("/api/ssl/renew", { method: "POST", body: "{}" });
    await handleRestartResponse(response.message);
  } catch (error) {
    showAlert(error.message);
  }
});

Promise.all([loadConfig(), loadStatus()]).catch((error) => showAlert(error.message));
