// Разовая привязка вебхука к деплою: deno task setwebhook https://<deploy-url>/webhook
import { config } from "../src/config.ts";

const url = Deno.args[0];
if (!url) {
  console.error("usage: deno task setwebhook <https://your-deploy-url/webhook>");
  Deno.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: config.webhookSecret || undefined,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  }),
});
console.log(await res.json());
