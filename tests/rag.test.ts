import { describe, expect, it } from "vitest";
import { chunkText } from "../src/rag/chunking";
import { cosineSimilarity, fromBlob, toBlob } from "../src/rag/similarity";

describe("chunkText", () => {
  it("découpe avec chevauchement", () => {
    const chunks = chunkText("abcdefghij", 5, 2);
    expect(chunks).toEqual(["abcde", "defgh", "ghij"]);
  });
  it("renvoie un seul chunk pour un texte court", () => {
    expect(chunkText("court", 100, 10)).toEqual(["court"]);
  });
  it("renvoie [] pour un texte vide", () => expect(chunkText("  ", 10, 2)).toEqual([]));
  it("refuse un overlap invalide", () => expect(() => chunkText("abc", 5, 5)).toThrow());
});

describe("similarité", () => {
  it("vaut 1 pour des vecteurs identiques", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
  it("vaut 0 pour des vecteurs orthogonaux", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it("conserve les valeurs après aller-retour BLOB", () => {
    const v = [0.5, -1.25, 3];
    expect(Array.from(fromBlob(toBlob(v)))).toEqual(v);
  });
});