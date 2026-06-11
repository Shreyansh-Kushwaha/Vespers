import { AzureOpenAI } from "openai";

let _client: AzureOpenAI | null = null;

/** Returns the shared AzureOpenAI client, initialising it on first call. */
export function getOpenAI(): AzureOpenAI {
  if (!_client) {
    _client = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview",
    });
  }
  return _client;
}

/**
 * Deployment to use for fire-and-forget summarisation. Defaults to the main
 * chat deployment so existing setups work without extra config. Override with
 * SUMMARISE_DEPLOYMENT to route summarisation to a cheaper model.
 */
export function getSummariseDeployment(): string {
  return process.env.SUMMARISE_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || "";
}
