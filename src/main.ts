// Точка входа для Deno Deploy: вебхук-обработчик. Telegram шлёт апдейты на /webhook.
import { webhookCallback } from "grammy";
import { bot } from "./bot.ts";
import { assertConfig, config } from "./config.ts";
import "./cron.ts";

assertConfig();

const handleUpdate = webhookCallback(bot, "std/http", {
  secretToken: config.webhookSecret || undefined,
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
