import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../src/tools/registry";
import { defineTool } from "../src/tools/types";

const fakeWrite = defineTool({
    name: "fake_write",
    access: "write",
    description: "outil d'écriture factice",
    parameters: z.object({}),
    execute: () => "écrit",
});
const fakeRead = defineTool({
    name: "fake_read",
    access: "read",
    description: "outil de lecture factice",
    parameters: z.object({}),
    execute: () => "lu",
});

const registry = new ToolRegistry();
registry.register(fakeWrite);
registry.register(fakeRead);

describe("autorisations des outils", () => {
    it("cache les outils d'écriture au lecteur", () => {
        const names = registry.toOllamaTools("reader").map((t) => t.function.name);
        expect(names).toEqual(["fake_read"]);
    });
    it("montre tous les outils à l'admin", () => {
        expect(registry.toOllamaTools("admin")).toHaveLength(2);
    });
    it("refuse l'exécution d'un outil d'écriture pour un lecteur", async () => {
        expect(await registry.execute("fake_write", {}, "reader")).toMatch(/réservé/);
    });
    it("autorise l'admin", async () => {
        expect(await registry.execute("fake_write", {}, "admin")).toBe("écrit");
    });
});