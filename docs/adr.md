# Décisions d'architecture (ADR)

## ADR-1 : SQLite + similarité cosinus côté application

**Contexte.** Le RAG demande de stocker des embeddings et de retrouver les plus proches d'une question. Le cahier des charges impose SQLite et interdit PostgreSQL/Redis.

**Décision.** Les embeddings sont stockés en BLOB (Float32) dans la table `chunks`. La similarité cosinus est calculée dans l'application, sur tous les chunks.

**Conséquences.** Zéro dépendance supplémentaire, très simple à tester et à expliquer. Le coût est linéaire avec le nombre de chunks : adapté à un corpus de quelques centaines de documents, pas à des millions. Évolution possible : extension de recherche vectorielle pour SQLite.

## ADR-2 : Outils déclaratifs avec `defineTool` et zod

**Contexte.** Le modèle doit pouvoir choisir des outils, et le code doit valider ce que le modèle envoie.

**Décision.** Chaque outil est défini par un nom, une description, un schéma zod et une fonction `execute`. Le même schéma sert à décrire l'outil au modèle (JSON Schema) et à valider les arguments reçus. `defineTool` infère le type des arguments depuis le schéma.

**Conséquences.** Une seule source de vérité par outil, ajout d'un outil en un fichier. Les erreurs d'outil sont renvoyées au modèle sous forme de texte pour qu'il puisse se corriger, sans faire échouer la requête.

## ADR-3 : Sécurité SQL en trois couches

**Contexte.** Le modèle génère du SQL : on ne peut pas lui faire confiance.

**Décision.**
1. Validation textuelle : une seule instruction, `SELECT` uniquement, commentaires et mots-clés d'écriture interdits, allowlist de tables.
2. Contrôle par SQLite lui-même (`stmt.readonly`).
3. Connexion distincte ouverte en lecture seule.

**Conséquences.** Une faille dans une couche est rattrapée par la suivante. La validation est une fonction pure, couverte par des tests unitaires.

## ADR-4 : Pas d'`eval` pour le calcul

**Décision.** L'outil de calcul utilise un petit parseur d'expressions (nombres, `+ - * / %`, parenthèses) avec liste blanche de caractères.

**Conséquences.** Aucune exécution de code arbitraire possible. Les expressions invalides ou les divisions par zéro lèvent une erreur claire.

## ADR-5 : Accès fichiers limité au corpus

**Décision.** Tout chemin est résolu dans le dossier du corpus, avec contrôle des `..`, des liens symboliques (`realpath`) et des extensions (md, txt, json, csv).

**Conséquences.** Un chemin hors corpus est refusé par le code, quel que soit ce que demande le modèle (test S7).

## ADR-6 : Un seul point d'accès à Ollama

**Décision.** Seul `src/llm/client.ts` importe la librairie `ollama`. Chat et embeddings partagent le même host.

**Conséquences.** Changer de modèle ou de librairie ne touche qu'un fichier. Les timeouts et le health check sont centralisés.

## ADR-7 : Boucle d'outils bornée

**Décision.** L'orchestrateur limite le nombre de tours d'outils (`MAX_TOOL_ITERATIONS`, défaut 5) et renvoie un message explicite si la limite est atteinte.

**Conséquences.** Un modèle qui boucle ne peut pas bloquer le service.

## ADR-8 : Historique persisté sans les échanges d'outils

**Décision.** Seuls les messages utilisateur et assistant sont stockés. Les appels d'outils et leurs résultats vivent le temps de la requête.

**Conséquences.** Implémentation simple, contexte court. Limite connue : le modèle ne revoit pas les résultats d'outils des tours précédents.