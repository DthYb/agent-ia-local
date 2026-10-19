import { z } from "zod";
import type { ToolDefinition } from "./types";
import { defineTool } from "./types";

// Grammaire : expr = terme (('+'|'-') terme)* ; terme = facteur (('*'|'/'|'%') facteur)*
// facteur = nombre | '(' expr ')' | '-' facteur
export function evaluate(input: string): number {
  const src = input.replace(/\s+/g, "");
  if (src.length === 0 || src.length > 200) throw new Error("Expression vide ou trop longue");
  if (!/^[0-9+\-*/%().,]+$/.test(src)) throw new Error("Caractères non autorisés");

  let pos = 0;
  const peek = () => src[pos];

  function parseNumber(): number {
    const m = /^\d+(?:[.,]\d+)?/.exec(src.slice(pos));
    if (!m) throw new Error(`Nombre attendu à la position ${pos}`);
    pos += m[0].length;
    return Number(m[0].replace(",", "."));
  }

  function parseFactor(): number {
    if (peek() === "-") {
      pos++;
      return -parseFactor();
    }
    if (peek() === "(") {
      pos++;
      const v = parseExpr();
      if (peek() !== ")") throw new Error("Parenthèse fermante manquante");
      pos++;
      return v;
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = src[pos++];
      const r = parseFactor();
      if (op === "*") v *= r;
      else if (r === 0) throw new Error("Division par zéro");
      else v = op === "/" ? v / r : v % r;
    }
    return v;
  }

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = src[pos++];
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  const result = parseExpr();
  if (pos < src.length) throw new Error(`Caractère inattendu à la position ${pos}`);
  return result;
}

export const calculatorTool = defineTool({
  name: "calculator",
  description:
    "Évalue une expression arithmétique (+, -, *, /, %, parenthèses). À utiliser pour tout calcul numérique.",
  parameters: z.object({
    expression: z.string().describe("L'expression à calculer, par exemple (12 + 8) * 3"),
  }),
  execute: ({ expression }) => String(evaluate(expression)),
});