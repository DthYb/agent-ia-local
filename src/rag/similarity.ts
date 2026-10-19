export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) throw new Error("Vecteurs de dimensions différentes");
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

// Stockage des embeddings en BLOB (Float32)
export function toBlob(v: number[]): Buffer {
  return Buffer.from(new Float32Array(v).buffer);
}

export function fromBlob(b: Buffer): Float32Array {
  return new Float32Array(new Uint8Array(b).buffer); // copie alignée
}