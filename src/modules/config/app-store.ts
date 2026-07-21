import { writeFile } from "node:fs/promises";

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
    this.config = config;

    await writeFile(
      appConfigPath,
      `${JSON.stringify(config, null, 2)}\n`,
    );

    return this.get();
  }

  async reloadFromDisk(): Promise<AppConfig> {
    this.config = await loadAppConfig();
    return this.get();
  }
}

export const appConfigStore = new AppConfigStore();
