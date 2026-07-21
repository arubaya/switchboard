const alertBox = document.getElementById("alert");
const downloadBackupButton = document.getElementById("download-backup");
const restoreForms = document.querySelectorAll(".restore-form");
const restoreCertsForm = document.getElementById("restore-certs-form");

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

async function readJsonFile(file) {
  const text = await file.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${file.name} is not valid JSON`);
  }
}

async function restoreJson(target, payload) {
  const response = await fetch(`/api/settings/restore/${target}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? `Restore failed (${response.status})`);
  }

  return body;
}

if (downloadBackupButton) {
  downloadBackupButton.addEventListener("click", async () => {
    clearAlert();
    downloadBackupButton.disabled = true;

    try {
      const response = await fetch("/api/settings/backup");

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Download failed (${response.status})`);
      }

      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "switchboard-backup.zip";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      showAlert("Backup downloaded.", "success");
    } catch (error) {
      showAlert(error.message);
    } finally {
      downloadBackupButton.disabled = false;
    }
  });
}

for (const form of restoreForms) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

    const target = form.dataset.target;
    const fileInput = form.querySelector('input[type="file"]');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const payload = await readJsonFile(fileInput.files[0]);
      const result = await restoreJson(target, payload);

      if (result.restarting) {
        showAlert(result.message, "info");
        const ready = await waitForServer();

        if (ready) {
          window.location.reload();
          return;
        }

        showAlert("Server restart timed out. Refresh manually.", "error");
        return;
      }

      showAlert(result.message, "success");
      form.reset();
    } catch (error) {
      showAlert(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });
}

if (restoreCertsForm) {
  restoreCertsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

    const fileInput = document.getElementById("restore-certs-input");
    const submitButton = restoreCertsForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const formData = new FormData();

      for (const file of fileInput.files) {
        formData.append("files", file, file.name);
      }

      const response = await fetch("/api/settings/restore/certs", {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? `Restore failed (${response.status})`);
      }

      if (body.restarting) {
        showAlert(body.message, "info");
        const ready = await waitForServer();

        if (ready) {
          window.location.reload();
          return;
        }

        showAlert("Server restart timed out. Refresh manually.", "error");
        return;
      }

      showAlert(body.message, "success");
      restoreCertsForm.reset();
    } catch (error) {
      showAlert(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });
}
