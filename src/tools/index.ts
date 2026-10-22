import { config } from "../config";
import { ToolRegistry } from "./registry";
import { calculatorTool } from "./calculator";
import { addContactTool } from "./contacts-admin";
import { listDocumentsTool, readDocumentTool } from "./files";
import { sqlQueryTool } from "./sql";
import { webSearchTool } from "./web-search";

export function createRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(calculatorTool);
  registry.register(listDocumentsTool);
  registry.register(readDocumentTool);
  registry.register(sqlQueryTool);
  registry.register(addContactTool);
  // Sans moteur configuré, le modèle ne voit même pas l'outil
  if (config.webSearch.searxngUrl) registry.register(webSearchTool);
  return registry;
}