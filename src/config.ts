// Конфиг из окружения. На Deno Deploy задаётся в настройках проекта, локально — .env.
export const config = {
  botToken: Deno.env.get("BOT_TOKEN") ?? "",
  // Базовый URL нашего Supabase-бэкенда, например https://<project>.supabase.co/functions/v1/api
  apiBase: (Deno.env.get("MELYO_API_BASE") ?? "").replace(/\/$/, ""),
  apiKey: Deno.env.get("MELYO_API_KEY") ?? "", // supabase anon key
  botApiSecret: Deno.env.get("BOT_API_SECRET") ?? "", // общий секрет для tg-роутов бэкенда
  webhookSecret: Deno.env.get("WEBHOOK_SECRET") ?? "", // проверка, что апдейт пришёл от Telegram
};

export function assertConfig(): void {
  const miss = (["botToken", "apiBase", "apiKey"] as const).filter((k) => !config[k]);
  if (miss.length) throw new Error(`Не заданы переменные окружения: ${miss.join(", ")}`);
}
