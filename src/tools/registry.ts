import type { Tool } from "ollama";
import { z } from "zod";
import type { ToolDefinition } from "./types";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  // Format attendu par Ollama
  toOllamaTools(): Tool[] {
    return [...this.tools.values()].map((t) => {
      const schema = z.toJSONSchema(t.parameters) as Record<string, unknown>;
      delete schema.$schema;
      return {
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: schema as Tool["function"]["parameters"],
        },
      };
    });
  }

  // Exécution contrôlée : l'outil doit exister et les arguments sont validés
  async execute(name: string, rawArgs: unknown): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) return `Erreur : outil inconnu "${name}"`;

    const parsed = tool.parameters.safeParse(rawArgs);
    if (!parsed.success) {
      return `Erreur : arguments invalides pour "${name}" : ${parsed.error.message}`;
    }
    try {
      return await tool.execute(parsed.data);
    } catch (err) {
      return `Erreur lors de l'exécution de "${name}" : ${(err as Error).message}`;
    }
  }
}