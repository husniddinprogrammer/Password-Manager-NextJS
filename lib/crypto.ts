import CryptoJS from 'crypto-js';

const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE = 256 / 32; // 256 bits

/**
 * Derives an AES-256 encryption key from a master password using PBKDF2.
 * The salt is deterministic so the same password always produces the same key.
 */
export function deriveKey(masterPassword: string): string {
  const salt = CryptoJS.enc.Utf8.parse('vault-salt-v1-do-not-change');
  const key = CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString();
}

/**
 * Encrypts plaintext using AES-256 CBC with a random IV.
 * Returns a combined string: iv:ciphertext (both hex-encoded).
 */
export function encrypt(plaintext: string, key: string): string {
  if (!plaintext) return '';
  const iv = CryptoJS.lib.WordArray.random(16);
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
}

/**
 * Decrypts a ciphertext string produced by encrypt().
 * Returns the original plaintext, or '' on failure.
 */
export function decrypt(ciphertext: string, key: string): string {
  if (!ciphertext) return '';
  try {
    const [ivHex, ctHex] = ciphertext.split(':');
    if (!ivHex || !ctHex) return '';
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(ctHex),
    });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
}

/**
 * Encrypts all sensitive fields of a credential payload.
 */
export function encryptCredentialFields(
  fields: { username: string; password: string; notes?: string },
  key: string
): { username: string; password: string; notes: string } {
  return {
    username: encrypt(fields.username, key),
    password: encrypt(fields.password, key),
    notes: fields.notes ? encrypt(fields.notes, key) : '',
  };
}

/**
 * Decrypts all sensitive fields of a credential.
 */
export function decryptCredentialFields(
  fields: { username: string; password: string; notes?: string | null },
  key: string
): { username: string; password: string; notes: string } {
  return {
    username: decrypt(fields.username, key),
    password: decrypt(fields.password, key),
    notes: fields.notes ? decrypt(fields.notes, key) : '',
  };
}
