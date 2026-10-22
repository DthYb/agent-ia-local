import { z } from "zod";
import { getSourceDb } from "../db/sources";
import { defineTool } from "./types";

export const addContactTool = defineTool({
    name: "add_contact",
    access: "write",
    description: "Ajoute un contact dans la table contacts de la base crm (réservé aux administrateurs).",
    parameters: z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        company: z.string().max(100).optional(),
        city: z.string().max(100).optional(),
    }),
    execute: ({ name, email, company, city }) => {
        const res = getSourceDb("crm")
            .prepare("INSERT INTO contacts (name, email, company, city) VALUES (?, ?, ?, ?)")
            .run(name, email, company ?? null, city ?? null);
        return `Contact créé (id ${res.lastInsertRowid})`;
    },
});