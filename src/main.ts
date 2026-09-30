// Точка входа для Deno Deploy: вебхук-обработчик. Telegram шлёт апдейты на /webhook.
import { webhookCallback } from "grammy";
import { bot } from "./bot.ts";
import { assertConfig, config } from "./config.ts";
import "./cron.ts";

assertConfig();

// За замовчуванням grammY чекає 10 с, а відповідь Меліо (LLM) буває довшою: тоді вебхук
// віддавав помилку, Telegram повторював апдейт і бот відповідав двічі.
const handleUpdate = webhookCallback(bot, "std/http", {
  secretToken: config.webhookSecret || undefined,
  timeoutMilliseconds: 55_000,
});

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname === "/webhook") {
    try {
      return await handleUpdate(req);
    } catch (e) {
      console.error("webhook error:", e);
      return new Response("error", { status: 500 });
    }
  }
  return new Response("Melyo bot is running.");
});
