import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { evaluate } from "../src/tools/calculator";
import { resolveInCorpus } from "../src/tools/corpus";
import { validateReadOnlySql } from "../src/tools/sql";

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

  it("accepte un SELECT sur contacts", () => {
    expect(validateReadOnlySql("SELECT * FROM contacts WHERE city = 'Lille';", known)).toContain("SELECT");
  });
  it("refuse les écritures", () => {
    expect(() => validateReadOnlySql("DELETE FROM contacts", known)).toThrow();
    expect(() => validateReadOnlySql("DROP TABLE contacts", known)).toThrow();
  });
  it("refuse les requêtes multiples", () => {
    expect(() => validateReadOnlySql("SELECT 1; DROP TABLE contacts", known)).toThrow();
  });
  it("refuse les tables hors allowlist", () => {
    expect(() => validateReadOnlySql("SELECT * FROM messages", known)).toThrow(/non autorisée/);
    expect(() => validateReadOnlySql("SELECT * FROM sqlite_master", known)).toThrow();
  });
});