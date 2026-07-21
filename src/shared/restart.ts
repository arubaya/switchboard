type RestartHandler = () => Promise<void>;

let restartHandler: RestartHandler | null = null;

export function setRestartHandler(handler: RestartHandler): void {
  restartHandler = handler;
}

export async function requestRestart(): Promise<void> {
  if (!restartHandler) {
    throw new Error("Restart handler not configured");
  }

  await restartHandler();
}
