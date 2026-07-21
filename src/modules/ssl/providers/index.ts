import { customProvider } from "./custom.js";
import { letsEncryptProvider } from "./letsencrypt.js";
import { createProviderRegistry } from "./types.js";

export const sslProviders = createProviderRegistry({
  custom: customProvider,
  letsencrypt: letsEncryptProvider,
});

export { customProvider, letsEncryptProvider };
