import { DecryptedCredential } from './types';

export interface ReusedGroup {
  password: string;
  credentials: DecryptedCredential[];
}

/**
 * Groups credentials that share the same password.
 * Returns only groups with 2+ credentials (i.e., actually reused).
 */
export function detectReusedPasswords(credentials: DecryptedCredential[]): ReusedGroup[] {
  const map = new Map<string, DecryptedCredential[]>();

  for (const cred of credentials) {
    if (!cred.password) continue;
    const existing = map.get(cred.password) ?? [];
    map.set(cred.password, [...existing, cred]);
  }

  return Array.from(map.entries())
    .filter(([, creds]) => creds.length > 1)
    .map(([password, creds]) => ({ password, credentials: creds }))
    .sort((a, b) => b.credentials.length - a.credentials.length);
}
