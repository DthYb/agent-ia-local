import type { z } from "zod";

export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: T; // schéma zod : sert à valider ET à décrire les paramètres
  execute: (args: z.infer<T>) => Promise<string> | string;
}

// Infère le type des arguments depuis le schéma, puis "efface" le générique
// pour que le registre puisse stocker des outils de types différents.
export function defineTool<T extends z.ZodTypeAny>(def: ToolDefinition<T>): ToolDefinition {
  return def as unknown as ToolDefinition;
}