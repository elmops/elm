export interface Identity {
  id: string;
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  createdAt: number;
  lastUsed: number;
}
