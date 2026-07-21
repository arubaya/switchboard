import { readFile } from "node:fs/promises";
import {
  createPublicKey,
  timingSafeEqual,
  X509Certificate,
} from "node:crypto";

import type { CertificateStatus } from "./schemas.js";

export type ResolvedCertificatePaths = {
  certificatePath: string;
  privateKeyPath: string;
};

export async function readCertificateMetadata(
  certificatePath: string | null,
  privateKeyPath: string | null,
): Promise<Omit<CertificateStatus, "httpsEnabled" | "provider">> {
  const errors: string[] = [];
  let certificateExists = false;
  let privateKeyExists = false;
  let certificateLoaded = false;

  if (!certificatePath || !privateKeyPath) {
    return emptyMetadata(errors);
  }

  try {
    await readFile(certificatePath);
    certificateExists = true;
  } catch {
    errors.push("Certificate file not found");
  }

  try {
    await readFile(privateKeyPath);
    privateKeyExists = true;
  } catch {
    errors.push("Private key file not found");
  }

  if (!certificateExists || !privateKeyExists) {
    return {
      certificateLoaded,
      certificateExists,
      privateKeyExists,
      issuer: null,
      subject: null,
      validFrom: null,
      validUntil: null,
      daysRemaining: null,
      domains: [],
      errors,
    };
  }

  try {
    const certPem = await readFile(certificatePath, "utf-8");
    const keyPem = await readFile(privateKeyPath, "utf-8");

    if (!(await certificateMatchesKey(certPem, keyPem))) {
      errors.push("Certificate does not match private key");
      return {
        certificateLoaded: false,
        certificateExists,
        privateKeyExists,
        issuer: null,
        subject: null,
        validFrom: null,
        validUntil: null,
        daysRemaining: null,
        domains: [],
        errors,
      };
    }

    const cert = new X509Certificate(certPem);
    const validUntil = new Date(cert.validTo);
    const daysRemaining = Math.ceil(
      (validUntil.getTime() - Date.now()) / 86_400_000,
    );

    if (daysRemaining < 0) {
      errors.push("Certificate is expired");
    }

    certificateLoaded = daysRemaining >= 0;

    return {
      certificateLoaded,
      certificateExists,
      privateKeyExists,
      issuer: cert.issuer,
      subject: cert.subject,
      validFrom: cert.validFrom,
      validUntil: cert.validTo,
      daysRemaining,
      domains: extractDomains(cert),
      errors,
    };
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Failed to read certificate",
    );

    return {
      certificateLoaded: false,
      certificateExists,
      privateKeyExists,
      issuer: null,
      subject: null,
      validFrom: null,
      validUntil: null,
      daysRemaining: null,
      domains: [],
      errors,
    };
  }
}

async function certificateMatchesKey(
  certPem: string,
  keyPem: string,
): Promise<boolean> {
  const cert = new X509Certificate(certPem);
  const certPublicKey = cert.publicKey.export({ type: "spki", format: "der" });
  const privatePublicKey = createPublicKey(keyPem).export({
    type: "spki",
    format: "der",
  });

  if (certPublicKey.length !== privatePublicKey.length) {
    return false;
  }

  return timingSafeEqual(certPublicKey, privatePublicKey);
}

function extractDomains(cert: X509Certificate): string[] {
  const domains = new Set<string>();

  if (cert.subject.includes("CN=")) {
    const cn = cert.subject
      .split("\n")
      .find((part) => part.startsWith("CN="))
      ?.slice(3);

    if (cn) {
      domains.add(cn);
    }
  }

  if (cert.subjectAltName) {
    for (const value of cert.subjectAltName.split(", ")) {
      if (value.startsWith("DNS:")) {
        domains.add(value.slice(4));
      }
    }
  }

  return [...domains];
}

function emptyMetadata(errors: string[]) {
  return {
    certificateLoaded: false,
    certificateExists: false,
    privateKeyExists: false,
    issuer: null,
    subject: null,
    validFrom: null,
    validUntil: null,
    daysRemaining: null,
    domains: [],
    errors,
  };
}
