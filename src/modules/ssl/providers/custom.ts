import { access } from "node:fs/promises";

import type { SslConfig } from "../schemas.js";
import { readCertificateMetadata } from "../certificate.js";
import { resolveAllowedPath } from "../path-utils.js";
import type { SslProvider } from "./types.js";

export const customProvider: SslProvider = {
  type: "custom",

  resolvePaths(config) {
    if (!config.custom.certificatePath || !config.custom.privateKeyPath) {
      return null;
    }

    return {
      certificatePath: resolveAllowedPath(config.custom.certificatePath),
      privateKeyPath: resolveAllowedPath(config.custom.privateKeyPath),
    };
  },

  async validateForSave(config) {
    const errors: string[] = [];

    if (!config.enabled) {
      return errors;
    }

    if (!config.custom.certificatePath || !config.custom.privateKeyPath) {
      errors.push("Certificate path and private key path are required");
      return errors;
    }

    let certificatePath = "";
    let privateKeyPath = "";

    try {
      certificatePath = resolveAllowedPath(config.custom.certificatePath);
      privateKeyPath = resolveAllowedPath(config.custom.privateKeyPath);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid path");
      return errors;
    }

    try {
      await access(certificatePath);
    } catch {
      errors.push("Certificate file does not exist");
    }

    try {
      await access(privateKeyPath);
    } catch {
      errors.push("Private key file does not exist");
    }

    if (errors.length > 0) {
      return errors;
    }

    const metadata = await readCertificateMetadata(
      certificatePath,
      privateKeyPath,
    );

    return metadata.errors;
  },
};
