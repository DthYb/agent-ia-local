import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { evaluate } from "../src/tools/calculator";
import { resolveInCorpus } from "../src/tools/corpus";
import { validateReadOnlySql } from "../src/tools/sql";
import { formatResults, normalizeQuery } from "../src/tools/web-search";
import { shouldOfferWebSearch, toolCallKey } from "../src/agent/orchestrator";

describe("calculator", () => {
  it("respecte les priorités", () => expect(evaluate("(123+77)*4-15")).toBe(785));
  it("refuse le code arbitraire", () => {
    expect(() => evaluate("process.exit()")).toThrow();
  });
  it("refuse la division par zéro", () => expect(() => evaluate("1/0")).toThrow());
});

describe("resolveInCorpus", () => {
  let root: string;
  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "corpus-"));
    fs.writeFileSync(path.join(root, "a.md"), "# test");
  });

  it("autorise un fichier du corpus", () => {
    expect(resolveInCorpus("a.md", root)).toContain("a.md");
  });
  it("refuse un chemin hors corpus", () => {
    expect(() => resolveInCorpus("../secret.md", root)).toThrow(/hors du corpus/);
    expect(() => resolveInCorpus("..\\..\\.env", root)).toThrow();
  });
  it("refuse une extension non autorisée", () => {
    expect(() => resolveInCorpus("a.exe", root)).toThrow();
  });
});

describe("validateReadOnlySql", () => {
  const known = ["contacts", "messages", "sessions", "documents", "chunks"];
  const allowed = ["contacts"];

  it("accepte un SELECT sur contacts", () => {
    expect(validateReadOnlySql("SELECT * FROM contacts WHERE city = 'Lille';", known, allowed)).toContain("SELECT");
  });
  it("refuse les écritures", () => {
    expect(() => validateReadOnlySql("DELETE FROM contacts", known, allowed)).toThrow();
    expect(() => validateReadOnlySql("DROP TABLE contacts", known, allowed)).toThrow();
  });
  it("refuse les requêtes multiples", () => {
    expect(() => validateReadOnlySql("SELECT 1; DROP TABLE contacts", known, allowed)).toThrow();
  });
  it("refuse les tables hors allowlist", () => {
    expect(() => validateReadOnlySql("SELECT * FROM messages", known, allowed)).toThrow(/non autorisée/);
    expect(() => validateReadOnlySql("SELECT * FROM sqlite_master", known, allowed)).toThrow();
  });
  it("applique l'allowlist propre à chaque base", () => {
    const ventes = ["commandes"];
    expect(validateReadOnlySql("SELECT * FROM commandes", ["commandes"], ventes)).toContain("commandes");
    expect(() => validateReadOnlySql("SELECT * FROM contacts", ["contacts"], ventes)).toThrow(/non autorisée/);
  });
});

describe("web_search", () => {
  it("normalise les requêtes pour le cache", () => {
    expect(normalizeQuery("  Météo   PARIS ")).toBe("météo paris");
  });
  it("signale le contenu externe au modèle", () => {
    const out = formatResults([{ title: "T", url: "https://example.com", snippet: "s" }]);
    expect(out).toMatch(/contenu externe/);
    expect(out).toContain("https://example.com");
  });
});

describe("orchestrateur : éviter les appels inutiles", () => {
  const chunk = (score: number) => ({ path: "a.md", content: "x", score });

  it("ne propose pas le web quand le corpus répond déjà", () => {
    expect(shouldOfferWebSearch([chunk(0.8)], 0.6)).toBe(false);
  });
  it("propose le web quand le corpus est faible ou vide", () => {
    expect(shouldOfferWebSearch([chunk(0.4)], 0.6)).toBe(true);
    expect(shouldOfferWebSearch([], 0.6)).toBe(true);
  });
  it("identifie les appels identiques", () => {
    expect(toolCallKey("web_search", { query: "a" })).toBe(toolCallKey("web_search", { query: "a" }));
    expect(toolCallKey("web_search", { query: "a" })).not.toBe(toolCallKey("web_search", { query: "b" }));
  });
});