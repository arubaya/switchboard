import { createPrivateKey, X509Certificate } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AppConfigSchema,
  RoutesConfigSchema,
  UsersConfigSchema,
} from "../config/schemas.js";
import { parseRoutes } from "../config/loader.js";
import { SslConfigSchema } from "../ssl/schemas.js";
import { certsDir } from "../../shared/paths.js";

export function parseJsonInput(input: unknown, label: string): unknown {
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }

  return input;
}

export function validateAppConfig(input: unknown) {
  return AppConfigSchema.parse(input);
}

export function validateRoutesConfig(input: unknown) {
  const parsed = RoutesConfigSchema.parse(input);
  return parseRoutes(parsed);
}

export function validateUsersConfig(input: unknown) {
  return UsersConfigSchema.parse(input);
}

export function validateSslConfig(input: unknown) {
  const config = SslConfigSchema.parse(input);

  if (config.enabled && config.httpPort === config.httpsPort) {
    throw new Error("HTTP and HTTPS ports must be different");
  }

  return config;
}

export function resolveCertRelativePath(filename: string): string {
  const normalized = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, "");

  if (!normalized || normalized === "." || path.isAbsolute(normalized)) {
    throw new Error(`Invalid certificate path: ${filename}`);
  }

  const target = path.resolve(certsDir, normalized);
  const root = path.resolve(certsDir);

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Invalid certificate path: ${filename}`);
  }

  return normalized;
}

export function validateCertificateContent(
  filename: string,
  content: string,
): void {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error(`${filename} is empty`);
  }

  if (filename.endsWith(".json")) {
    JSON.parse(trimmed);
    return;
  }

  if (!trimmed.includes("-----BEGIN")) {
    throw new Error(`${filename}: invalid PEM format`);
  }

  if (/PRIVATE KEY-----/i.test(trimmed)) {
    createPrivateKey(trimmed);
    return;
  }

  if (/CERTIFICATE-----/i.test(trimmed)) {
    new X509Certificate(trimmed);
    return;
  }

  throw new Error(`${filename}: unsupported certificate file type`);
}

export async function writeCertificateFile(
  relativePath: string,
  content: string | Buffer,
): Promise<string> {
  validateCertificateContent(relativePath, content.toString("utf-8"));

  const targetPath = path.join(certsDir, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, {
    mode: relativePath.includes("key") ? 0o600 : 0o644,
  });

  return relativePath;
}
