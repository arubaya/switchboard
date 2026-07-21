import { writeFile } from "node:fs/promises";

import {
  canBindPrivilegedPort,
  isPrivilegedPort,
  privilegedPortMessage,
} from "../../shared/bind-port.js";
import { loadAppConfig } from "./loader.js";
import { AppConfigSchema, type AppConfig } from "./schemas.js";
import { appConfigPath } from "../../shared/paths.js";

export class AppConfigStore {
  private config: AppConfig | null = null;

  async load(): Promise<AppConfig> {
    this.config = await loadAppConfig();
    return this.get();
  }

  get(): AppConfig {
    if (!this.config) {
      throw new Error("App config not loaded");
    }

    return { ...this.config };
  }

  async save(input: AppConfig): Promise<AppConfig> {
    const config = AppConfigSchema.parse(input);

    if (isPrivilegedPort(config.port) && !canBindPrivilegedPort()) {
      throw new Error(privilegedPortMessage(config.port));
    }

    this.config = config;

    await writeFile(
      appConfigPath,
      `${JSON.stringify(config, null, 2)}\n`,
    );

    return this.get();
  }
}

export const appConfigStore = new AppConfigStore();
