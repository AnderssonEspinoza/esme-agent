import { env, requireEnv } from "./env";

type GeminiApiError = Error & {
  status?: number;
  retryAfterSeconds?: number | null;
};

const GEMINI_MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview-09-2025",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.0-pro",
  "gemini-pro",
];

export function isGeminiConfigured() {
  return Boolean(env.geminiApiKey);
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function analyzeScheduleImage(input: {
  mimeType: string;
  base64Data: string;
}) {
  const apiKey = requireEnv("geminiApiKey");
  let lastError: GeminiApiError | null = null;

  for (const model of GEMINI_MODELS_TO_TRY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      "Lee esta imagen de horario o calendario. Extrae dias, horas, curso o evento, aula si existe y devuelve solo JSON con la forma {\"items\":[{\"day\":\"\",\"start\":\"\",\"end\":\"\",\"title\":\"\",\"location\":\"\"}]}",
                  },
                  {
                    inline_data: {
                      mime_type: input.mimeType,
                      data: input.base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `Gemini request failed with ${model}: ${response.status} ${errorText}`,
        ) as GeminiApiError;
        error.status = response.status;
        error.retryAfterSeconds = extractRetryDelay(errorText);
        lastError = error;
        continue;
      }

      const json = await response.json();
      const text =
        json.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? "")
          .join("\n") ?? "";

      return {
        rawText: text,
        parsed: extractJson(text),
        modelUsed: model,
      };
    } catch (error) {
      lastError = error as GeminiApiError;
    }
  }

  throw lastError ?? new Error("Gemini request failed: no se pudo usar ningun modelo.");
}

function extractRetryDelay(text: string) {
  const match = text.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (!match) {
    return null;
  }

  const seconds = Number.parseFloat(match[1] ?? "");
  return Number.isFinite(seconds) ? Math.ceil(seconds) : null;
}
