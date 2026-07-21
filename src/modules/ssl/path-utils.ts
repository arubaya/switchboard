import path from "node:path";

const projectRoot = process.cwd();

export function resolveAllowedPath(input: string): string {
  if (!input.trim()) {
    throw new Error("Path is required");
  }

  if (input.includes("\0")) {
    throw new Error("Invalid path");
  }

  const resolved = path.resolve(projectRoot, input);

  if (
    resolved !== projectRoot &&
    !resolved.startsWith(`${projectRoot}${path.sep}`)
  ) {
    throw new Error("Path must be inside the project directory");
  }

  return resolved;
}

export function isPathInside(basePath: string, targetPath: string): boolean {
  const base = path.resolve(basePath);
  const target = path.resolve(targetPath);

  return target === base || target.startsWith(`${base}${path.sep}`);
}
