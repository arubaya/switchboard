import { readFile, writeFile } from "node:fs/promises";

import { loadUsersConfig } from "./loader.js";
import { UserSchema, UsersConfigSchema, type User } from "./schemas.js";
import { usersConfigPath } from "../../shared/paths.js";

export class UsersStore {
  private users: User[] = [];

  async load(): Promise<User[]> {
    const config = await loadUsersConfig();
    this.users = config.users;
    return this.getAll();
  }

  getAll(): User[] {
    return this.users.map((user) => ({ ...user }));
  }

  getPublicList(): Array<{ username: string }> {
    return this.users.map((user) => ({ username: user.username }));
  }

  getByUsername(username: string): User | undefined {
    const user = this.users.find((item) => item.username === username);
    return user ? { ...user } : undefined;
  }

  validate(username: string, password: string): boolean {
    const user = this.users.find((item) => item.username === username);
    return Boolean(user && user.password === password);
  }

  async create(input: User): Promise<User> {
    const user = UserSchema.parse(input);

    if (this.getByUsername(user.username)) {
      throw new Error(`User "${user.username}" already exists`);
    }

    this.users.push(user);
    await this.persist();
    return user;
  }

  async update(
    username: string,
    patch: { username?: string; password?: string },
  ): Promise<User> {
    const index = this.users.findIndex((item) => item.username === username);

    if (index === -1) {
      throw new Error(`User "${username}" not found`);
    }

    const updated = UserSchema.parse({
      ...this.users[index],
      ...patch,
    });

    const usernameTaken = this.users.some(
      (item, itemIndex) =>
        itemIndex !== index && item.username === updated.username,
    );

    if (usernameTaken) {
      throw new Error(`User "${updated.username}" already exists`);
    }

    this.users[index] = updated;
    await this.persist();
    return updated;
  }

  async delete(username: string): Promise<void> {
    if (this.users.length <= 1) {
      throw new Error("Cannot delete the last user");
    }

    const index = this.users.findIndex((item) => item.username === username);

    if (index === -1) {
      throw new Error(`User "${username}" not found`);
    }

    this.users.splice(index, 1);
    await this.persist();
  }

  private async persist(): Promise<void> {
    const payload = UsersConfigSchema.parse({ users: this.users });
    await writeFile(
      usersConfigPath,
      `${JSON.stringify(payload, null, 2)}\n`,
    );
  }

  async reloadFromDisk(): Promise<User[]> {
    const raw = await readFile(usersConfigPath, "utf-8");
    const data = UsersConfigSchema.parse(JSON.parse(raw));
    this.users = data.users;
    return this.getAll();
  }
}

export const usersStore = new UsersStore();
