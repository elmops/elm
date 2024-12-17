const KEY_PARAMS = {
  name: 'ECDSA',
  namedCurve: 'P-256',
} as const;

const SIGN_ALGORITHM = {
  ...KEY_PARAMS,
  hash: { name: 'SHA-384' },
} as const;

const KEY_USAGE: KeyUsage[] = ['sign', 'verify'] as const;

export interface ExportedKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return (await window.crypto.subtle.generateKey(
    KEY_PARAMS,
    true, // extractable
    KEY_USAGE
  )) as CryptoKeyPair;
}

export async function exportKeyPair(
  keyPair: CryptoKeyPair
): Promise<ExportedKeyPair> {
  const publicKey = await window.crypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey
  );
  const privateKey = await window.crypto.subtle.exportKey(
    'jwk',
    keyPair.privateKey
  );
  return { publicKey, privateKey };
}

export async function importKeyPair(
  exported: ExportedKeyPair
): Promise<CryptoKeyPair> {
  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    exported.publicKey,
    KEY_PARAMS,
    true,
    ['verify']
  );

  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    exported.privateKey,
    KEY_PARAMS,
    true,
    ['sign']
  );

  return { publicKey, privateKey };
}

export async function signData(
  data: any,
  privateKey: CryptoKey
): Promise<string> {
  // Convert data to bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(JSON.stringify(data));

  // Sign the data
  const signature = await window.crypto.subtle.sign(
    SIGN_ALGORITHM,
    privateKey,
    dataBytes
  );

  // Convert signature to base64 string
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(
  data: any,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  // Convert data to bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(JSON.stringify(data));

  // Convert base64 signature back to bytes
  const signatureBytes = Uint8Array.from(atob(signature), (c) =>
    c.charCodeAt(0)
  );

  // Verify the signature
  return await window.crypto.subtle.verify(
    SIGN_ALGORITHM,
    publicKey,
    signatureBytes,
    dataBytes
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', key);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey('jwk', jwk, KEY_PARAMS, true, [
    'verify',
  ]);
}
