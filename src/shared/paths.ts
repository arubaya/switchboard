import path from "node:path";

const root = process.cwd();

export const dataDir = path.join(root, "data");
export const appConfigPath = path.join(dataDir, "app.json");
export const usersConfigPath = path.join(dataDir, "users.json");
export const routesConfigPath = path.join(dataDir, "routes.json");
export const sslConfigPath = path.join(dataDir, "ssl.json");
export const certsDir = path.join(dataDir, "certs");

export const letsEncryptDirs = {
  production: path.join(certsDir, "letsencrypt", "production"),
  staging: path.join(certsDir, "letsencrypt", "staging"),
} as const;

export function getLetsEncryptDir(staging: boolean): string {
  return staging ? letsEncryptDirs.staging : letsEncryptDirs.production;
}
