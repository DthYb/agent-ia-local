import { Ollama, type Message, type Tool } from "ollama";
import { config } from "../config";

const client = new Ollama({
  host: config.ollama.url,
  // timeout appliqué à chaque appel vers Ollama
  fetch: (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(config.ollama.timeoutMs) }),
});

export async function chat(messages: Message[], tools?: Tool[]) {
  return client.chat({
    model: config.ollama.chatModel,
    messages,
    tools,
    stream: false,
  });
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await client.embed({ model: config.ollama.embedModel, input: texts });
  return res.embeddings;
}

export interface OllamaStatus {
  up: boolean;
  chatModelInstalled: boolean;
  embedModelInstalled: boolean;
}

export async function checkOllama(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${config.ollama.url}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { up: false, chatModelInstalled: false, embedModelInstalled: false };
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name);
    const has = (model: string) =>
      names.some((n) => n === model || n === `${model}:latest`);
    return {
      up: true,
      chatModelInstalled: has(config.ollama.chatModel),
      embedModelInstalled: has(config.ollama.embedModel),
    };
  } catch {
    return { up: false, chatModelInstalled: false, embedModelInstalled: false };
  }
}