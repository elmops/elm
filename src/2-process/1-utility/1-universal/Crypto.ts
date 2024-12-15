const ALGORITHM = {
  name: 'ECDSA',
  namedCurve: 'P-256',
  hash: { name: 'SHA-384' },
} as const;

const KEY_USAGE: KeyUsage[] = ['sign', 'verify'] as const;

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return (await window.crypto.subtle.generateKey(
    ALGORITHM,
    true, // extractable
    KEY_USAGE
  )) as CryptoKeyPair;
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
    ALGORITHM,
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
    ALGORITHM,
    publicKey,
    signatureBytes,
    dataBytes
  );
}
