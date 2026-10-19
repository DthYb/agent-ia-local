export function chunkText(text: string, size: number, overlap: number): string[] {
  if (size <= 0) throw new Error("size doit être > 0");
  if (overlap < 0 || overlap >= size) throw new Error("overlap doit être >= 0 et < size");

  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const chunks: string[] = [];
  const step = size - overlap;
  for (let start = 0; start < clean.length; start += step) {
    const end = Math.min(start + size, clean.length);
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end === clean.length) break;
  }
  return chunks;
}