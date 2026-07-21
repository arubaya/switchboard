import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import acme from "acme-client";

import type { SslConfig } from "../schemas.js";
import { readCertificateMetadata } from "../certificate.js";
import { acmeChallengeStore } from "../challenge-store.js";
import { getLetsEncryptDir } from "../../../shared/paths.js";
import type { SslProvider } from "./types.js";

const ACCOUNT_KEY = "account.key";

export function getLetsEncryptCertificatePaths(staging: boolean) {
  const dir = getLetsEncryptDir(staging);

  return {
    certificatePath: path.join(dir, "fullchain.pem"),
    privateKeyPath: path.join(dir, "privkey.pem"),
    accountKeyPath: path.join(dir, ACCOUNT_KEY),
    metadataPath: path.join(dir, "metadata.json"),
  };
}

export const letsEncryptProvider: SslProvider = {
  type: "letsencrypt",

  resolvePaths(config) {
    const paths = getLetsEncryptCertificatePaths(config.letsencrypt.staging);

    return {
      certificatePath: paths.certificatePath,
      privateKeyPath: paths.privateKeyPath,
    };
  },

  async validateForSave(config) {
    const errors: string[] = [];

    if (!config.enabled) {
      return errors;
    }

    if (!config.letsencrypt.email) {
      errors.push("Let's Encrypt email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.letsencrypt.email)) {
      errors.push("Let's Encrypt email is invalid");
    }

    if (config.letsencrypt.domains.length === 0) {
      errors.push("At least one domain is required for Let's Encrypt");
    }

    if (config.httpPort !== 80) {
      errors.push(
        "HTTP port must be 80 for Let's Encrypt HTTP-01 challenge",
      );
    }

    const paths = getLetsEncryptCertificatePaths(config.letsencrypt.staging);
    const metadata = await readCertificateMetadata(
      paths.certificatePath,
      paths.privateKeyPath,
    );

    if (metadata.errors.length > 0 && metadata.certificateExists) {
      errors.push(...metadata.errors);
    }

    return errors;
  },
};

export async function issueLetsEncryptCertificate(
  config: SslConfig,
  log?: { info: (message: string) => void; error: (error: unknown) => void },
): Promise<void> {
  if (!config.letsencrypt.email) {
    throw new Error("Let's Encrypt email is required");
  }

  if (config.letsencrypt.domains.length === 0) {
    throw new Error("At least one domain is required");
  }

  if (config.httpPort !== 80) {
    throw new Error("HTTP port must be 80 for Let's Encrypt HTTP-01 challenge");
  }

  const paths = getLetsEncryptCertificatePaths(config.letsencrypt.staging);
  await mkdir(path.dirname(paths.certificatePath), { recursive: true });

  const accountKey = await loadOrCreateAccountKey(paths.accountKeyPath);
  const directoryUrl = config.letsencrypt.staging
    ? acme.directory.letsencrypt.staging
    : acme.directory.letsencrypt.production;

  const client = new acme.Client({
    directoryUrl,
    accountKey,
  });

  const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
    altNames: config.letsencrypt.domains,
  });

  log?.info("Requesting Let's Encrypt certificate");

  const certificate = await client.auto({
    csr: certificateRequest,
    email: config.letsencrypt.email,
    termsOfServiceAgreed: true,
    challengePriority: ["http-01"],
    challengeCreateFn: async (_authz, challenge, keyAuthorization) => {
      if (challenge.type !== "http-01") {
        throw new Error(`Unsupported challenge type: ${challenge.type}`);
      }

      acmeChallengeStore.set(challenge.token, keyAuthorization);
    },
    challengeRemoveFn: async (_authz, challenge) => {
      acmeChallengeStore.delete(challenge.token);
    },
  });

  acmeChallengeStore.clear();

  await writeFile(paths.privateKeyPath, String(certificateKey), { mode: 0o600 });
  await writeFile(paths.certificatePath, String(certificate), { mode: 0o644 });
  await writeFile(
    paths.metadataPath,
    `${JSON.stringify(
      {
        provider: "letsencrypt",
        email: config.letsencrypt.email,
        domains: config.letsencrypt.domains,
        staging: config.letsencrypt.staging,
        issuedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  log?.info("Let's Encrypt certificate stored");
}

async function loadOrCreateAccountKey(accountKeyPath: string): Promise<string> {
  try {
    await access(accountKeyPath);
    return readFile(accountKeyPath, "utf-8");
  } catch {
    const accountKey = await acme.crypto.createPrivateKey();
    const accountKeyPem = `${accountKey}`;
    await writeFile(accountKeyPath, accountKeyPem, { mode: 0o600 });
    return accountKeyPem;
  }
}

export async function renewLetsEncryptCertificate(
  config: SslConfig,
  log?: { info: (message: string) => void; error: (error: unknown) => void },
): Promise<void> {
  const paths = getLetsEncryptCertificatePaths(config.letsencrypt.staging);

  try {
    await access(paths.certificatePath);
  } catch {
    throw new Error("No managed Let's Encrypt certificate found to renew");
  }

  await issueLetsEncryptCertificate(config, log);
}
