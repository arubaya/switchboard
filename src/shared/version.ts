import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type VersionInfo = {
  version: string;
  build: string;
  commit: string | null;
};

function readPackageVersion(): string {
  try {
    const packagePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../package.json",
    );
    const raw = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return process.env.SWITCHBOARD_VERSION ?? "0.0.0";
  }
}

export function getVersionInfo(): VersionInfo {
  const commit =
    process.env.SWITCHBOARD_COMMIT?.trim() ||
    process.env.GIT_COMMIT?.trim() ||
    null;

  return {
    version: process.env.SWITCHBOARD_VERSION?.trim() || readPackageVersion(),
    build: process.env.SWITCHBOARD_BUILD?.trim() || "dev",
    commit,
  };
}
