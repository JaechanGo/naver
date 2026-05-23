import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

let cached: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (cached) return cached;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  cached = new GoogleGenerativeAI(key);
  return cached;
}

export const GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiModel(config?: {
  temperature?: number;
  maxOutputTokens?: number;
}): GenerativeModel {
  const client = getClient();
  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: config?.temperature,
      maxOutputTokens: config?.maxOutputTokens,
    },
  });
}
