import fp from "fastify-plugin";
import basicAuth from "@fastify/basic-auth";

import { loadUsersConfig } from "../modules/config/loader.js";

export default fp(async (app) => {
  const { users } = await loadUsersConfig();

  const credentials = new Map(
    users.map((user) => [user.username, user.password]),
  );

  await app.register(basicAuth, {
    validate: async (username, password) => {
      const expected = credentials.get(username);

      if (!expected || expected !== password) {
        throw new Error("Unauthorized");
      }
    },
    authenticate: { realm: "Switchboard" },
  });
});
