import { ToolRegistry } from "./registry";
import { calculatorTool } from "./calculator";

export function createRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(calculatorTool);
  return registry;
}