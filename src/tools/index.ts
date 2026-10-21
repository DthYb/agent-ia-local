import { ToolRegistry } from "./registry";
import { calculatorTool } from "./calculator";
import { addContactTool } from "./contacts-admin";
import { listDocumentsTool, readDocumentTool } from "./files";
import { sqlQueryTool } from "./sql";

export function createRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(calculatorTool);
  registry.register(listDocumentsTool);
  registry.register(readDocumentTool);
  registry.register(sqlQueryTool);
  registry.register(addContactTool);
  return registry;
}