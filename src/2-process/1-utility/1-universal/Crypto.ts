import { logger } from './Logging';

export interface KeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

const ALGORITHM = {
  name: 'Ed25519',
} as const;

const KEY_USAGE: KeyUsage[] = ['sign', 'verify'] as const;

export async function generateKeyPair(): Promise<KeyPair> {
  try {
    const keyPair = (await crypto.subtle.generateKey(
      ALGORITHM,
      true,
      KEY_USAGE
    )) as CryptoKeyPair;

    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    return { publicKey, privateKey };
  } catch (error) {
    logger.error('Failed to generate key pair:', error);
    throw new Error('Failed to generate cryptographic keys');
  }
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, ALGORITHM, true, ['verify']);
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, ALGORITHM, true, ['sign']);
}

export async function sign(
  privateKey: CryptoKey,
  data: ArrayBuffer
): Promise<ArrayBuffer> {
  return crypto.subtle.sign(ALGORITHM, privateKey, data);
}

export async function verify(
  publicKey: CryptoKey,
  signature: ArrayBuffer,
  data: ArrayBuffer
): Promise<boolean> {
  return crypto.subtle.verify(ALGORITHM, publicKey, signature, data);
}
