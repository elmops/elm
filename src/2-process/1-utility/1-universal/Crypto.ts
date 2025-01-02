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

export async function importKey(publicKey: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'jwk',
    publicKey,
    KEY_PARAMS,
    true,
    ['verify']
  );
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

export function comparePublicKeys(key1: JsonWebKey, key2: JsonWebKey): boolean {
  // Compare required key type
  if (key1.kty !== key2.kty) {
    return false;
  }

  switch (key1.kty) {
    case 'RSA':
      // RSA public key components
      return key1.n === key2.n && key1.e === key2.e;

    case 'EC':
      // Elliptic Curve public key components
      return key1.crv === key2.crv && key1.x === key2.x && key1.y === key2.y;

    case 'oct':
      // Symmetric key
      return key1.k === key2.k;

    case 'OKP':
      // Edwards-curve and Montgomery-curve keys
      return key1.crv === key2.crv && key1.x === key2.x;

    default:
      throw new Error(`Unsupported key type: ${key1.kty}`);
  }
}
