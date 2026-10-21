import type { z } from "zod";
import type { Access } from "../auth/roles";

export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  access: Access; // "read" : tout le monde, "write" : admin uniquement
  parameters: T;
  execute: (args: z.infer<T>) => Promise<string> | string;
}

// Infère le type des arguments depuis le schéma, puis "efface" le générique
// pour que le registre puisse stocker des outils de types différents.
export function defineTool<T extends z.ZodTypeAny>(def: ToolDefinition<T>): ToolDefinition {
  return def as unknown as ToolDefinition;
}