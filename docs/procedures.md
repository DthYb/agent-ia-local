# Procédures de développement

## 1. Installation de l'environnement

1. Installer Node.js 20+ et Ollama.
2. `ollama pull qwen3.5:4b` et `ollama pull nomic-embed-text-v2-moe`
3. `npm install`, puis copier `.env.example` en `.env`
4. `npm run db:init` puis `npm run db:seed`
5. `npm run dev` dans un terminal, les tests dans un autre

## 2. Ajouter un outil

1. Créer `src/tools/mon-outil.ts` :

```ts
import { z } from "zod";
import { defineTool } from "./types";

export const monOutil = defineTool({
  name: "mon_outil",
  description: "Ce que fait l'outil, pour que le modèle sache quand l'utiliser.",
  parameters: z.object({
    valeur: z.string().describe("Description du paramètre"),
  }),
  execute: ({ valeur }) => `Résultat pour ${valeur}`,
});
```

2. L'enregistrer dans `src/tools/index.ts` (`registry.register(monOutil)`).
3. Le mentionner dans le prompt système de `src/agent/orchestrator.ts`.
4. Si l'outil touche au disque ou à la base : valider les entrées dans une fonction pure et la tester dans `tests/`.
5. Vérifier avec `npm run typecheck` et `npm test`.

## 3. Pipeline RAG

1. **Ingestion** (`POST /ingest`) : lecture du fichier dans le corpus, hash SHA-256, découpage en chunks (`CHUNK_SIZE`, `CHUNK_OVERLAP`), embeddings par lots de 16 via Ollama, écriture transactionnelle dans `documents` et `chunks`.
2. **Fichier inchangé** : le hash est identique, rien n'est ré-embedé (statut `unchanged`).
3. **Retrieval** : la question est transformée en embedding, comparée à tous les chunks par similarité cosinus, filtrée par `MIN_SCORE`, limitée à `RAG_TOP_K`.
4. **Injection** : les passages sont ajoutés au contexte avant l'appel au modèle, et les chemins des fichiers sont renvoyés dans `sources`.

Réglages : `CHUNK_SIZE` et `CHUNK_OVERLAP` dans le `.env`, `MIN_SCORE` dans `src/rag/retriever.ts`. Après un changement de modèle d'embeddings, supprimer `data/agent.db`, relancer `db:init` et `db:seed`, puis refaire `/ingest`.

## 4. Tests

- `npm run typecheck` : types sans erreur.
- `npm test` : chunking, similarité, calcul, accès corpus, validation SQL.
- Tests manuels des scénarios S1 à S8 : voir la démo du README.

## 5. Dépannage

| Problème | Solution |
|---|---|
| `/health` en `degraded`, modèles à `false` | Aligner `CHAT_MODEL` et `EMBED_MODEL` sur `ollama list`, puis redémarrer `npm run dev` |
| `ollama` : connexion refusée sur le port 5050 | Supprimer la variable d'environnement `OLLAMA_HOST` |
| Erreur « fetch failed » ou 503 | Ollama n'est pas lancé, ou le modèle est trop lent : augmenter `LLM_TIMEOUT_MS` |
| Invoke-RestMethod : impossible de se connecter | Le serveur doit tourner dans un terminal séparé |
| Erreurs TS1295 / TS1287 | Retirer `verbatimModuleSyntax` du `tsconfig.json` |
| Le modèle n'appelle pas les outils | Utiliser un modèle avec tool calling (ex. `llama3.2`) |
| `sources` vide après ingestion | Baisser `MIN_SCORE` dans `retriever.ts` |
| Caractères accentués illisibles dans la console | Problème d'affichage PowerShell, sans effet sur les données |