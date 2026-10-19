import fs from "node:fs";
import { z } from "zod";
import { defineTool } from "./types";
import { listCorpusFiles, MAX_READ_CHARS, resolveInCorpus } from "./corpus";

export const listDocumentsTool = defineTool({
  name: "list_documents",
  description: "Liste les documents disponibles dans le corpus documentaire.",
  parameters: z.object({}),
  execute: () => {
    const files = listCorpusFiles();
    return files.length ? files.join("\n") : "Le corpus est vide.";
  },
});

export const readDocumentTool = defineTool({
  name: "read_document",
  description:
    "Lit le contenu d'un document du corpus. Le chemin est relatif au corpus, tel que renvoyé par list_documents.",
  parameters: z.object({
    path: z.string().describe("Chemin relatif du document, par exemple politique-conges.md"),
  }),
  execute: ({ path }) => {
    const content = fs.readFileSync(resolveInCorpus(path), "utf8");
    return content.length > MAX_READ_CHARS
      ? content.slice(0, MAX_READ_CHARS) + "\n[... contenu tronqué ...]"
      : content;
  },
});