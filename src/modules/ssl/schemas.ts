import { z } from "zod";

export const CustomProviderSchema = z.object({
  certificatePath: z.string(),
  privateKeyPath: z.string(),
});

export const LetsEncryptProviderSchema = z.object({
  email: z.string().default(""),
  domains: z.array(z.string().min(1)).default([]),
  staging: z.boolean().default(false),
  autoRenew: z.boolean().default(true),
});

export const SslConfigSchema = z.object({
  enabled: z.boolean().default(false),
  httpPort: z.coerce.number().int().min(1).max(65535).default(8080),
  httpsPort: z.coerce.number().int().min(1).max(65535).default(8443),
  redirectHttpToHttps: z.boolean().default(true),
  provider: z.enum(["custom", "letsencrypt"]),
  custom: CustomProviderSchema,
  letsencrypt: LetsEncryptProviderSchema,
});

export const SslConfigPatchSchema = SslConfigSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" },
);

export type SslConfig = z.infer<typeof SslConfigSchema>;
export type SslProviderType = SslConfig["provider"];

export type CertificateStatus = {
  httpsEnabled: boolean;
  provider: SslProviderType;
  certificateLoaded: boolean;
  certificateExists: boolean;
  privateKeyExists: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validUntil: string | null;
  daysRemaining: number | null;
  domains: string[];
  errors: string[];
};
