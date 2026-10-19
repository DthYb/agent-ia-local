# Agent IA local

Agent IA exposé en API REST : Node.js 20+, TypeScript, Ollama (chat + embeddings), SQLite, RAG et outils sécurisés.

## Architecture

```
Client HTTP → API REST (Express) → Orchestrateur agent
                                     ├─ RAG retriever ─→ SQLite (chunks + embeddings) ←─ Ollama (embeddings)
                                     ├─ Client LLM ────→ Ollama (chat)
                                     └─ Registre d'outils → calculator · list_documents · read_document · sql_query
```

| Dossier | Rôle |
|---|---|
| `src/config` | lecture et validation du `.env` (zod), logger |
| `src/api` | routes Express : health, chat, sessions, ingest, documents |
| `src/agent` | orchestrateur : contexte, RAG, boucle d'outils bornée |
| `src/llm` | client Ollama (seul fichier qui l'importe) |
| `src/rag` | chunking, similarité cosinus, ingestion, retriever |
| `src/tools` | registre d'outils et outils (avec garde-fous) |
| `src/db` | connexion SQLite, migrations, sessions/messages |
| `scripts` | initialisation et seed de la base |
| `corpus` | documents d'exemple (md, txt, json, csv) |
| `tests` | tests unitaires (vitest) |

## Démarrage rapide

### 1. Prérequis
- Node.js 20+
- [Ollama](https://ollama.com/download) installé et lancé

### 2. Modèles Ollama
```bash
ollama pull qwen3.5:4b                # chat avec tool calling
ollama pull nomic-embed-text-v2-moe   # embeddings
ollama list
```

### 3. Installation
```bash
npm install
cp .env.example .env     # PowerShell : Copy-Item .env.example .env
```
Les noms de modèles du `.env` doivent correspondre exactement à `ollama list`.

### 4. Base de données
```bash
npm run db:init    # crée les tables
npm run db:seed    # peuple la table de démo `contacts`
```

### 5. Lancement
```bash
npm run dev
```

## Configuration (`.env`)

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | port d'écoute | 3000 |
| `OLLAMA_URL` | URL du serveur Ollama | http://localhost:11434 |
| `CHAT_MODEL` / `EMBED_MODEL` | modèles de chat et d'embeddings | voir `.env.example` |
| `DB_PATH` / `CORPUS_PATH` | base SQLite et dossier du corpus | ./data/agent.db, ./corpus |
| `LLM_TIMEOUT_MS` | timeout des appels Ollama | 60000 |
| `MAX_TOOL_ITERATIONS` | nombre max de tours d'outils | 5 |
| `RAG_TOP_K` | passages injectés dans le contexte | 4 |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | découpage des documents | 800 / 100 |

## API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | état de la base et d'Ollama (200 ou 503) |
| POST | `/chat` | `{ "message": "...", "sessionId": "..."? }` → `{ sessionId, answer, toolsUsed, sources }` |
| DELETE | `/sessions/:id` | supprime une session (204) |
| POST | `/ingest` | `{ "path": "." }` indexe un fichier ou dossier du corpus |
| GET | `/documents` | liste des documents indexés |

Erreurs : 400 (requête invalide), 404 (session ou chemin inconnu), 503 (Ollama indisponible), 500 (erreur interne).

## Démo (PowerShell)

```powershell
curl.exe http://localhost:3000/health
Invoke-RestMethod -Method Post -Uri http://localhost:3000/ingest -ContentType "application/json" -Body '{"path":"."}'
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/chat -ContentType "application/json" -Body '{"message":"Combien de jours de télétravail par semaine ?"}'
$r | ConvertTo-Json -Depth 5
```

## Sécurité

- **Pas de `eval`** : le calcul passe par un parseur d'expressions dédié.
- **Fichiers** : chemins résolus dans le corpus uniquement (protection `..` et liens symboliques), extensions md/txt/json/csv.
- **SQL** : un seul `SELECT`, mots-clés d'écriture et commentaires interdits, allowlist de tables (`contacts`), connexion SQLite ouverte en lecture seule.
- **Outils** : arguments validés par zod, outils inconnus jamais exécutés, boucle bornée.

## Tests

```bash
npm run typecheck
npm test
```

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `/health` renvoie `degraded` avec modèles à `false` | noms du `.env` différents de `ollama list`, ou serveur non redémarré après modification du `.env` |
| `ollama` : « connection refused » sur le port 5050 | variable `OLLAMA_HOST` définie à tort : la supprimer |
| 503 sur `/chat` | Ollama arrêté, modèle trop lent (augmenter `LLM_TIMEOUT_MS`) |
| Le modèle n'appelle pas les outils | modèle sans tool calling : essayer `llama3.2` |
| `sources` vide après ingestion | `MIN_SCORE` trop haut dans `src/rag/retriever.ts` |

## Décisions d'architecture
Voir `docs/adr.md`.