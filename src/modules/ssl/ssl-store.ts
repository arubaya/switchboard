import { readFile, writeFile } from "node:fs/promises";

import { sslConfigPath } from "../../shared/paths.js";
import { readCertificateMetadata } from "./certificate.js";
import { sslProviders } from "./providers/index.js";
import {
  SslConfigPatchSchema,
  SslConfigSchema,
  type CertificateStatus,
  type SslConfig,
} from "./schemas.js";

export class SslStore {
  private config: SslConfig | null = null;

  async load(): Promise<SslConfig> {
    const raw = await readFile(sslConfigPath, "utf-8");
    this.config = SslConfigSchema.parse(JSON.parse(raw));
    return this.get();
  }

  get(): SslConfig {
    if (!this.config) {
      throw new Error("SSL config not loaded");
    }

    return structuredClone(this.config);
  }

  async save(input: SslConfig): Promise<SslConfig> {
    const config = SslConfigSchema.parse(input);
    const errors = await this.collectValidationErrors(config);

    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }

    this.config = config;
    await writeFile(sslConfigPath, `${JSON.stringify(config, null, 2)}\n`);
    return this.get();
  }

  async patch(input: Partial<SslConfig>): Promise<SslConfig> {
    SslConfigPatchSchema.parse(input);

    const merged = SslConfigSchema.parse({
      ...this.get(),
      ...input,
      custom: {
        ...this.get().custom,
        ...input.custom,
      },
      letsencrypt: {
        ...this.get().letsencrypt,
        ...input.letsencrypt,
      },
    });

    return this.save(merged);
  }

  async getStatus(): Promise<CertificateStatus> {
    const config = this.get();
    const provider = sslProviders.get(config.provider);
    const paths = provider.resolvePaths(config);
    const metadata = await readCertificateMetadata(
      paths?.certificatePath ?? null,
      paths?.privateKeyPath ?? null,
    );

    return {
      httpsEnabled: config.enabled,
      provider: config.provider,
      ...metadata,
    };
  }

  private async collectValidationErrors(config: SslConfig): Promise<string[]> {
    const errors: string[] = [];

    if (config.enabled && config.httpPort === config.httpsPort) {
      errors.push("HTTP and HTTPS ports must be different");
    }

    const provider = sslProviders.get(config.provider);
    errors.push(...(await provider.validateForSave(config)));

    if (config.enabled) {
      const paths = provider.resolvePaths(config);
      const metadata = await readCertificateMetadata(
        paths?.certificatePath ?? null,
        paths?.privateKeyPath ?? null,
      );

      if (!metadata.certificateLoaded) {
        errors.push("A valid certificate is required before HTTPS can be enabled");
      }
    }

    return errors;
  }
}

export const sslStore = new SslStore();
