import type { z } from "zod";

export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: T; // schéma zod : sert à valider ET à décrire les paramètres
  execute: (args: z.infer<T>) => Promise<string> | string;
}