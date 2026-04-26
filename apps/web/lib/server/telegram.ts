import { env, requireEnv } from "./env";

export function isTelegramConfigured() {
  return Boolean(env.telegramBotToken && env.telegramChatId);
}

export async function sendTelegramMessage(text: string) {
  const token = requireEnv("telegramBotToken");
  const chatId = requireEnv("telegramChatId");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram request failed: ${response.status}`);
  }

  return response.json();
}

export async function sendTelegramMessageToChat(chatId: string | number, text: string) {
  const token = requireEnv("telegramBotToken");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram request failed: ${response.status}`);
  }

  return response.json();
}

export async function setTelegramWebhook() {
  const token = requireEnv("telegramBotToken");
  const baseUrl = requireEnv("xioPublicBaseUrl");

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: `${baseUrl}/api/telegram/webhook`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram setWebhook failed: ${response.status}`);
  }

  return response.json();
}

export function buildTelegramReply(text: string) {
  const normalized = text.toLowerCase();

  if (normalized.includes("hola")) {
    return "Hola. Soy E.S.M.E. Ya estoy conectada a XIO. Puedo ayudarte con agenda, universidad, empleo y recordatorios.";
  }

  if (normalized.includes("hoy")) {
    return "Hoy tienes clase, bloque de estudio y revisión de LinkedIn. Si quieres, luego te doy el resumen completo del día.";
  }

  if (normalized.includes("record") || normalized.includes("recuerda")) {
    return "Puedo ayudarte con eso. Muy pronto convertiré ese mensaje en una tarea o recordatorio automático dentro de XIO.";
  }

  if (normalized.includes("trabajo") || normalized.includes("linkedin")) {
    return "Puedo seguir tus vacantes y postulaciones. Cuando conectemos tu flujo completo, te avisaré cuáles requieren acción primero.";
  }

  return "Te leí. Ya estoy lista para conversar por Telegram. El siguiente paso es conectar esta conversación con tu memoria real de XIO.";
}

