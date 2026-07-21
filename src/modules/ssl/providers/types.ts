import type { SslConfig } from "../schemas.js";
import type { ResolvedCertificatePaths } from "../certificate.js";

export type SslProvider = {
  type: SslConfig["provider"];
  resolvePaths(config: SslConfig): ResolvedCertificatePaths | null;
  validateForSave(config: SslConfig): Promise<string[]>;
};

export type SslProviderRegistry = {
  get(type: SslConfig["provider"]): SslProvider;
};

export function createProviderRegistry(
  providers: Record<SslConfig["provider"], SslProvider>,
): SslProviderRegistry {
  return {
    get(type) {
      const provider = providers[type];

      if (!provider) {
        throw new Error(`Unsupported SSL provider: ${type}`);
      }

      return provider;
    },
  };
}
