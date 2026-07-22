import { z } from "zod";

import { CURRENT_SCHEMA_VERSION } from "../../shared/schema-version.js";

export const AppConfigSchema = z.object({
  schemaVersion: z.number().int().positive().default(CURRENT_SCHEMA_VERSION),
  host: z.string().default("0.0.0.0"),
  port: z.coerce.number().int().positive().default(8080),
});

export const UserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const UsersConfigSchema = z.object({
  schemaVersion: z.number().int().positive().default(CURRENT_SCHEMA_VERSION),
  users: z.array(UserSchema).min(1),
});

export const RouteSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  path: z.string().startsWith("/"),
  target: z.string().url(),
  stripPrefix: z.boolean().default(true),
  corsOrigins: z.array(z.string().min(1)).default([]),
});

export const RoutesConfigSchema = z.object({
  schemaVersion: z.number().int().positive().default(CURRENT_SCHEMA_VERSION),
  routes: z.array(z.unknown()),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type User = z.infer<typeof UserSchema>;
export type UsersConfig = z.infer<typeof UsersConfigSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RoutesConfig = z.infer<typeof RoutesConfigSchema>;
