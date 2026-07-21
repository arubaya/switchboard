import path from "node:path";

const root = process.cwd();

export const dataDir = path.join(root, "data");
export const appConfigPath = path.join(dataDir, "app.json");
export const usersConfigPath = path.join(dataDir, "users.json");
export const routesConfigPath = path.join(dataDir, "routes.json");
